#!/usr/bin/env python3
"""Local-only AI runtime. Normal execution never installs or downloads models.

Preparation is explicit: prepare --task TASK [--download] [--storage PATH].
Dependencies live outside FastAPI in separate image/speech virtual environments.
"""
from __future__ import annotations
import argparse
import base64
import contextlib
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / ".local"
CONFIG = LOCAL / "local-ai.json"
GIB = 1024 ** 3
RUNTIMES = {"image": "mflux==0.20.0", "speech": "kokoro==0.9.4"}
REPOS = {"image": "black-forest-labs/FLUX.2-klein-4B", "speech": "hexgrad/Kokoro-82M", "transcribe": "ggerganov/whisper.cpp"}
VOICES = ("af_heart", "af_bella", "am_adam", "bf_emma")

class RuntimeUnavailable(RuntimeError):
    pass

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeUnavailable("Local inference cannot follow redirects.")

def read_json(path, default=None):
    try:
        return json.loads(Path(path).read_text())
    except FileNotFoundError:
        return {} if default is None else default

def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + f".{os.getpid()}.tmp")
    temporary.write_text(json.dumps(value, indent=2))
    temporary.chmod(0o600)
    temporary.replace(path)

def storage_root(override=None):
    config = read_json(CONFIG)
    return Path(override or os.environ.get("LOCAL_AI_STORAGE") or config.get("storage") or LOCAL / "ai").expanduser().resolve()

def lock_path(storage):
    return storage / "runtime-lock.json"

def digest(path):
    result = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(4 * 1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()

def ollama_url():
    value = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    parsed = urllib.parse.urlparse(value)
    if parsed.scheme not in ("http", "https") or parsed.hostname not in ("localhost", "127.0.0.1", "::1") or parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise RuntimeUnavailable("Ollama must use a loopback HTTP address without credentials or redirects.")
    return value

def ollama(route, body=None, timeout=10):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(ollama_url() + route, data=None if body is None else json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with opener.open(request, timeout=timeout) as response:
        return json.load(response)

def local_model(task, pinned=None):
    model = os.environ.get("LOCAL_AI_TEXT_MODEL" if task == "text" else "LOCAL_AI_VISION_MODEL", "qwen3:latest" if task == "text" else "gemma3:latest")
    if "cloud" in model.lower() or "://" in model or not re.fullmatch(r"[A-Za-z0-9_./:-]+", model):
        raise RuntimeUnavailable("Cloud-backed Ollama models are not allowed.")
    tags = ollama("/api/tags").get("models", [])
    item = next((m for m in tags if m.get("name") == model or m.get("model") == model), None)
    if not item:
        raise RuntimeUnavailable(f"Install the local {model} model explicitly before preparation.")
    shown = ollama("/api/show", {"model": model})
    for data in (item, shown):
        if data.get("remote_host") or data.get("remote_model") or data.get("details", {}).get("remote_host") or data.get("details", {}).get("remote_model"):
            raise RuntimeUnavailable("Cloud-backed Ollama model metadata is not allowed.")
    if re.search(r"(?im)^\s*FROM\s+.*(?:cloud|https?://)", shown.get("modelfile", "")):
        raise RuntimeUnavailable("Remote Ollama model source is not allowed.")
    resolved = item.get("digest", "")
    if not re.fullmatch(r"(?:sha256:)?[a-f0-9]{64}", resolved):
        raise RuntimeUnavailable("Ollama did not supply a resolved model digest.")
    version = ollama("/api/version").get("version")
    if pinned and (pinned.get("digest") != resolved or pinned.get("model") != model or pinned.get("runtime_version") != version):
        raise RuntimeUnavailable("The Ollama model or runtime changed. Re-run explicit preparation to review and pin it.")
    return {"model": model, "digest": resolved, "runtime_version": version}

def disk_plan(storage, task, model_bytes=None):
    existing = storage
    while not existing.exists():
        existing = existing.parent
    estimate = {"image": 15_000_000_000, "speech": 400_000_000, "transcribe": 148_000_000, "text": 0, "vision": 0}[task]
    download = estimate if model_bytes is None else model_bytes
    dependencies = {"image": 3 * GIB, "speech": 2 * GIB}.get(task, 0)
    reserve = 5 * GIB
    required = download * 2 + dependencies + reserve
    free = shutil.disk_usage(existing).free
    return {"storage": str(storage), "download_bytes": download, "staging_bytes": download, "dependencies_bytes": dependencies, "working_reserve_bytes": reserve, "required_free_bytes": required, "free_bytes": free, "sufficient": free >= required}

def file_records(directory):
    return {str(path.relative_to(directory)): {"size": path.stat().st_size, "sha256": digest(path)} for path in sorted(directory.rglob("*")) if path.is_file() and ".cache" not in path.parts}

def verify_files(entry, full=False):
    directory = Path(entry.get("model_path", ""))
    files = entry.get("files", {})
    if not files:
        raise RuntimeUnavailable("No prepared model file manifest. Run explicit preparation.")
    for name, expected in files.items():
        path = directory / name
        if not path.is_file() or path.stat().st_size != expected["size"]:
            raise RuntimeUnavailable(f"Prepared model file missing or changed: {name}")
        if full and digest(path) != expected["sha256"]:
            raise RuntimeUnavailable(f"Prepared model checksum changed: {name}")

def verify_runtime(entry, task):
    executable = Path(entry.get("binary" if task == "transcribe" else "python", ""))
    if not executable.is_file():
        raise RuntimeUnavailable("Prepared runtime executable is missing.")
    if task == "transcribe":
        if digest(executable) != entry.get("binary_sha256"):
            raise RuntimeUnavailable("whisper.cpp changed; re-run explicit preparation to pin it.")
        if not shutil.which("ffmpeg"):
            raise RuntimeUnavailable("FFmpeg is required to decode recorded speech.")
    else:
        code = "import importlib.metadata as m,json,sys; expected=json.load(sys.stdin); changed=[n for n,v in expected.items() if m.version(n)!=v]; sys.exit(bool(changed))"
        dependencies = entry.get("dependencies") or dict([entry["runtime_version"].split("==", 1)])
        try:
            subprocess.run([str(executable), "-c", code], input=json.dumps(dependencies), text=True, capture_output=True, timeout=10, check=True)
        except (OSError, subprocess.SubprocessError):
            raise RuntimeUnavailable("Prepared runtime dependencies changed or are missing. Re-run explicit preparation.")

def readiness(storage=None):
    storage = storage_root(storage)
    lock = read_json(lock_path(storage))
    capabilities = {}
    for task in ("text", "vision", "image", "speech", "transcribe"):
        entry = lock.get(task)
        try:
            if not entry:
                raise RuntimeUnavailable(f"Not prepared. Run python3 scripts/local_ai_runtime.py prepare --task {task}.")
            if task in ("text", "vision"):
                model = local_model(task, entry)
            else:
                verify_files(entry)
                verify_runtime(entry, task)
                model = {"model": entry["model"], "runtime_version": entry["runtime_version"]}
            capabilities[task] = {"ready": True, "reason": "Installed and pinned; inference runs locally.", **model}
        except Exception as error:
            capabilities[task] = {"ready": False, "reason": str(error)}
    return {"capabilities": capabilities, "storage": disk_plan(storage, "image"), "local_only": True}

def run_task(task, payload, output, storage=None):
    storage = storage_root(storage)
    entry = read_json(lock_path(storage)).get(task)
    if not entry:
        raise RuntimeUnavailable(f"The {task} runtime is not prepared. Manual creation remains available.")
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    if shutil.disk_usage(output).free < 512 * 1024 * 1024:
        raise RuntimeUnavailable("Less than 512 MiB working space remains. Choose another output location.")
    started = time.monotonic()
    if task in ("text", "vision"):
        resolved = local_model(task, entry)
        prompt = str(payload.get("prompt", ""))
        if not prompt or len(prompt) > 32000:
            raise ValueError("Provide a prompt of 1–32000 characters.")
        message = {"role": "user", "content": prompt}
        if task == "vision":
            images = payload.get("images", [])
            if not 1 <= len(images) <= 4:
                raise ValueError("Vision requires one to four local images.")
            if any(Path(p).stat().st_size > 12 * 1024 * 1024 for p in images):
                raise ValueError("Vision images must each be at most 12 MiB.")
            message["images"] = [base64.b64encode(Path(p).read_bytes()).decode() for p in images]
        body = {"model": resolved["model"], "messages": [message], "stream": False, "options": {"temperature": 0, "num_predict": 6000}}
        if task == "text":
            body["think"] = False
        if payload.get("schema"):
            body["format"] = payload["schema"]
        result = ollama("/api/chat", body, timeout=1200)
        content = result.get("message", {}).get("content", "")
        data = json.loads(content) if payload.get("schema") else content
        result = {"data": data, **resolved}
    elif task == "transcribe":
        verify_files(entry, full=True)
        verify_runtime(entry, task)
        audio = Path(payload["audioPath"]).resolve()
        if not audio.is_file():
            raise ValueError("Recorded speech file is missing.")
        wav = output / "input-16k.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-y", "-i", str(audio), "-ac", "1", "-ar", "16000", str(wav)], check=True, timeout=120, stdout=sys.stderr)
        prefix = output / "whisper"
        subprocess.run([entry["binary"], "-m", str(Path(entry["model_path"]) / "ggml-base.en.bin"), "-f", str(wav), "-l", "en", "-oj", "-of", str(prefix), "-ml", "70", "-sow"], check=True, timeout=600, stdout=sys.stderr)
        transcript = read_json(str(prefix) + ".json")
        cues = [{"start_seconds": row["offsets"]["from"] / 1000, "end_seconds": row["offsets"]["to"] / 1000, "text": row["text"].strip()} for row in transcript.get("transcription", []) if row["text"].strip()]
        result = {"text": " ".join(c["text"] for c in cues), "cues": cues}
        wav.unlink(missing_ok=True)
    else:
        verify_files(entry, full=True)
        verify_runtime(entry, task)
        request_path = output / "runtime-input.json"
        atomic_json(request_path, {"task": task, "input": payload, "runtime": entry, "output": str(output)})
        environment = {**os.environ, "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1", "HF_HUB_DISABLE_TELEMETRY": "1", "TOKENIZERS_PARALLELISM": "false"}
        subprocess.run([entry["python"], str(ROOT / "scripts/local_ai_adapter.py"), str(request_path)], check=True, env=environment, timeout=1800, stdout=sys.stderr)
        result = read_json(output / "adapter-result.json")
        request_path.unlink(missing_ok=True)
    result["elapsed_seconds"] = round(time.monotonic() - started, 3)
    atomic_json(output / "result.json", result)
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    status = sub.add_parser("status")
    status.add_argument("--storage")
    prepare = sub.add_parser("prepare")
    prepare.add_argument("--task", required=True, choices=("text", "vision", "image", "speech", "transcribe"))
    prepare.add_argument("--storage")
    prepare.add_argument("--download", action="store_true", help="Explicitly permit dependency and model downloads after the disk-space check")
    run = sub.add_parser("run")
    run.add_argument("--task", required=True, choices=("text", "vision", "image", "speech", "transcribe"))
    run.add_argument("--input", required=True)
    run.add_argument("--output", required=True)
    run.add_argument("--storage")
    args = parser.parse_args()
    try:
        if args.command == "status":
            result = readiness(args.storage)
        elif args.command == "run":
            result = run_task(args.task, read_json(args.input), args.output, args.storage)
        else:
            from prepare_local_ai import prepare_runtime
            result = prepare_runtime(args.task, storage_root(args.storage), args.download)
        print(json.dumps(result))
    except Exception as error:
        print(json.dumps({"error": str(error), "local_only": True}), file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
