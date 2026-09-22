"""Explicit, disk-gated preparation; imported only by the prepare command."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request
from local_ai_runtime import (CONFIG, REPOS, RUNTIMES, VOICES, RuntimeUnavailable,
    atomic_json, digest, disk_plan, file_records, local_model, lock_path, read_json)


def selected_files(task, metadata):
    def wanted(name):
        if task == "image":
            return name.startswith(("transformer/", "text_encoder/", "vae/", "tokenizer/", "scheduler/")) or name in ("model_index.json", "added_tokens.json", "chat_template.jinja")
        if task == "speech":
            return name in ("config.json", "kokoro-v1_0.pth", *(f"voices/{v}.pt" for v in VOICES))
        return name == "ggml-base.en.bin"
    files = [item for item in metadata["siblings"] if wanted(item["rfilename"])]
    if not files or any("size" not in item for item in files):
        raise RuntimeUnavailable("Model metadata is incomplete; cannot safely estimate preparation space.")
    return files


def prepare_runtime(task, storage, download=False):
    lock = read_json(lock_path(storage))
    if task in ("text", "vision"):
        entry = local_model(task)
        lock[task] = entry
        atomic_json(lock_path(storage), lock)
        atomic_json(CONFIG, {"storage": str(storage)})
        return {"prepared": task, **entry, "downloaded": False}
    if task == "transcribe" and download and (not shutil.which("whisper-cli") or not shutil.which("ffmpeg")):
        raise RuntimeUnavailable("Install whisper.cpp and FFmpeg explicitly before preparing transcription.")
    estimate = disk_plan(storage, task)
    if not download:
        return {"prepared": False, "task": task, "storage": estimate,
            "next_step": "Repeat with --download to explicitly install the isolated runtime and model files. Another volume can be selected with --storage /absolute/path."}
    if not estimate["sufficient"]:
        raise RuntimeUnavailable(f"Insufficient disk space: need {estimate['required_free_bytes']} bytes, available {estimate['free_bytes']}. Use --storage on another volume. Nothing was deleted or downloaded.")
    with urllib.request.urlopen(f"https://huggingface.co/api/models/{REPOS[task]}?blobs=true", timeout=30) as response:
        metadata = json.load(response)
    revision = metadata["sha"]
    if not isinstance(revision, str) or len(revision) != 40:
        raise RuntimeUnavailable("Model repository did not resolve to a pinned revision.")
    files = selected_files(task, metadata)
    model_dir = storage / "models" / task / revision
    remaining = sum(item["size"] for item in files if not (model_dir / item["rfilename"]).is_file() or (model_dir / item["rfilename"]).stat().st_size != item["size"])
    estimate = disk_plan(storage, task, remaining)
    print(json.dumps({"preparation": estimate, "revision": revision}), file=sys.stderr)
    if not estimate["sufficient"]:
        raise RuntimeUnavailable("Resolved model and staging space exceed the available space. Choose another storage location.")
    storage.mkdir(parents=True, exist_ok=True)
    python = None
    if task in RUNTIMES:
        venv = storage / "runtimes" / task
        python = venv / "bin/python"
        if not python.is_file():
            subprocess.run([sys.executable, "-m", "venv", str(venv)], check=True, stdout=sys.stderr)
        packages = [RUNTIMES[task]]
        if task == "speech":
            packages += ["soundfile==0.13.1", "https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"]
        subprocess.run([str(python), "-m", "pip", "install", "--disable-pip-version-check", *packages], check=True, stdout=sys.stderr)
        resolved = subprocess.check_output([str(python), "-m", "pip", "freeze"], text=True)
        (venv / "requirements.lock.txt").write_text(resolved)
    # Download exact files from the resolved revision; retries reuse complete files.
    # Models use staging on the selected volume, then atomic rename after length/hash checks.
    model_dir.mkdir(parents=True, exist_ok=True)
    for item in files:
        relative = Path(item["rfilename"])
        if relative.is_absolute() or ".." in relative.parts:
            raise RuntimeUnavailable("Unsafe path in model metadata.")
        destination = model_dir / relative
        expected_hash = item.get("lfs", {}).get("sha256")
        if destination.is_file() and destination.stat().st_size == item["size"] and (not expected_hash or digest(destination) == expected_hash):
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        staging = destination.with_name(destination.name + ".partial")
        url = f"https://huggingface.co/{REPOS[task]}/resolve/{revision}/{relative.as_posix()}"
        with urllib.request.urlopen(url, timeout=120) as response, staging.open("wb") as output:
            shutil.copyfileobj(response, output, length=4 * 1024 * 1024)
        if staging.stat().st_size != item["size"] or (expected_hash and digest(staging) != expected_hash):
            raise RuntimeUnavailable(f"Model file verification failed: {relative}. Preparation can be retried.")
        staging.replace(destination)
    entry = {"model": REPOS[task], "revision": revision, "model_path": str(model_dir), "files": file_records(model_dir)}
    if task == "transcribe":
        binary = shutil.which("whisper-cli")
        if not binary or not shutil.which("ffmpeg"):
            raise RuntimeUnavailable("Install whisper.cpp and FFmpeg explicitly before preparing transcription.")
        entry.update(binary=binary, runtime_version=subprocess.check_output([binary, "--version"], stderr=subprocess.STDOUT, text=True).strip(), binary_sha256=digest(binary))
    else:
        dependencies = json.loads(subprocess.check_output([str(python), "-m", "pip", "list", "--format=json", "--disable-pip-version-check"], text=True))
        entry.update(python=str(python), runtime_version=RUNTIMES[task], requirements_sha256=digest(storage / "runtimes" / task / "requirements.lock.txt"), dependencies={item["name"]:item["version"] for item in dependencies})
        if task == "speech":
            # Prime English support in the explicit online preparation stage only.
            subprocess.run([str(python), "-c", "from kokoro import KPipeline; p=KPipeline(lang_code='a',model=False,repo_id='hexgrad/Kokoro-82M'); list(p('Local speech is ready.'))"], check=True, stdout=sys.stderr)
    lock[task] = entry
    atomic_json(lock_path(storage), lock)
    atomic_json(CONFIG, {"storage": str(storage)})
    return {"prepared": task, "model": entry["model"], "revision": revision, "storage": estimate}
