"""Runs inside one isolated image/speech environment. No networking is permitted."""
import importlib.metadata
import importlib.util
import json
import os
from pathlib import Path
import socket
import sys

for key in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_HUB_DISABLE_TELEMETRY"):
    os.environ[key] = "1"

def offline(*args, **kwargs):
    raise RuntimeError("Network access is disabled during local inference. Run explicit preparation first.")
socket.socket.connect = offline
socket.socket.connect_ex = offline
socket.create_connection = offline

job = json.loads(Path(sys.argv[1]).read_text())
request, runtime, task = job["input"], job["runtime"], job["task"]
output, model_path = Path(job["output"]), Path(runtime["model_path"])
package, expected = runtime["runtime_version"].split("==", 1)
if importlib.metadata.version(package) != expected:
    raise RuntimeError("Prepared runtime version changed; re-run explicit preparation.")
for dependency, version in runtime.get("dependencies", {}).items():
    if importlib.metadata.version(dependency) != version:
        raise RuntimeError(f"Prepared dependency changed: {dependency}. Re-run explicit preparation.")
if task == "image":
    from mflux.models.common.config import ModelConfig
    from mflux.models.flux2.variants import Flux2Klein
    width, height = int(request.get("width", 1024)), int(request.get("height", 1024))
    if not 256 <= width <= 1536 or not 256 <= height <= 1536 or width % 16 or height % 16:
        raise ValueError("Image dimensions must be multiples of 16 between 256 and 1536.")
    prompt = str(request.get("prompt", ""))
    if not 1 <= len(prompt) <= 6000:
        raise ValueError("Artwork prompt must contain 1–6000 characters.")
    model = Flux2Klein(model_config=ModelConfig.flux2_klein_4b(), model_path=str(model_path), quantize=4)
    image = model.generate_image(seed=int(request.get("seed", 42)), prompt=prompt, num_inference_steps=4, width=width, height=height)
    destination = output / "artwork.png"
    image.save(str(destination))
    result = {"path": str(destination), "mime_type": "image/png", "width": width, "height": height}
else:
    if importlib.util.find_spec("en_core_web_sm") is None:
        raise RuntimeError("Prepared English language data is missing. No automatic downloads are allowed.")
    import numpy as np
    import soundfile as sf
    from kokoro import KModel, KPipeline
    voice = str(request.get("voice", "af_heart"))
    if voice not in ("af_heart", "af_bella", "am_adam", "bf_emma"):
        raise ValueError("Select a prepared Kokoro stock English voice.")
    text = str(request.get("text", ""))
    if not 1 <= len(text.strip()) <= 3000:
        raise ValueError("Narration must contain 1–3000 characters.")
    model = KModel(repo_id="hexgrad/Kokoro-82M", config=str(model_path / "config.json"), model=str(model_path / "kokoro-v1_0.pth")).eval()
    pipeline = KPipeline(lang_code=voice[0], repo_id="hexgrad/Kokoro-82M", model=model)
    segments = [audio.numpy() for _, _, audio in pipeline(text, voice=str(model_path / "voices" / f"{voice}.pt"), speed=1)]
    if not segments:
        raise RuntimeError("The speech model produced no audio.")
    audio = np.concatenate(segments)
    destination = output / "narration.wav"
    sf.write(destination, audio, 24000, subtype="PCM_16")
    result = {"path": str(destination), "mime_type": "audio/wav", "duration_seconds": len(audio) / 24000, "voice": voice}
(output / "adapter-result.json").write_text(json.dumps(result))
