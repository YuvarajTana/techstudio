#!/usr/bin/env python3
"""Fetch a small CC0 / public-domain real-estate photo set from Wikimedia Commons.

Licence, author and source come from Commons' own file metadata (extmetadata);
nothing is typed in by hand. Only files whose metadata says CC0 or public
domain are accepted. Photos are resized to <=1600 px / <=300 KB JPEG and
recorded in backend/media/asset-library/real-estate/ATTRIBUTION.json with a
sha256, so later edits are detectable.

    python scripts/fetch_cc0_photos.py --dry-run     # list candidates only
    python scripts/fetch_cc0_photos.py               # download + write manifest
    python scripts/fetch_cc0_photos.py --verify      # check files vs manifest

Needs outbound HTTPS to commons.wikimedia.org and upload.wikimedia.org.
Spot-check each photo's source page before publishing designs that use it.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "backend/media/asset-library/real-estate"
MANIFEST = TARGET / "ATTRIBUTION.json"
API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "TECKSTUDIO-asset-fetch/1.0 (local design tool; CC0 photo import)"
MAX_EDGE = 1600
MAX_BYTES = 300_000

# (key, title, search, tags) — one photo per subject.
SUBJECTS = [
    ("house-exterior", "Family House Exterior", "house exterior facade", ["house", "exterior", "home"]),
    ("modern-home", "Modern Home", "modern house architecture", ["modern", "house", "architecture"]),
    ("living-room", "Living Room Interior", "living room interior", ["living room", "interior", "sofa"]),
    ("kitchen", "Kitchen Interior", "kitchen interior", ["kitchen", "interior", "cooking"]),
    ("bedroom", "Bedroom Interior", "bedroom interior", ["bedroom", "interior", "bed"]),
    ("bathroom", "Bathroom Interior", "bathroom interior", ["bathroom", "interior", "bath"]),
    ("apartment-building", "Apartment Building", "apartment building", ["apartment", "building", "city"]),
    ("suburban-street", "Suburban Street", "suburban street houses", ["neighborhood", "street", "suburb"]),
    ("garden", "Backyard Garden", "backyard garden house", ["garden", "backyard", "outdoor"]),
    ("front-door", "Front Door", "front door house", ["door", "entrance", "home"]),
]

ACCEPTED = {"cc0": "CC0-1.0", "pd": "PDM-1.0"}
LICENSE_URLS = {
    "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
    "PDM-1.0": "https://creativecommons.org/publicdomain/mark/1.0/",
}


def api(params: dict) -> dict:
    url = f"{API}?{urllib.parse.urlencode({**params, 'format': 'json'})}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def plain(value: str | None) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).strip()


def license_of(meta: dict) -> str | None:
    """Map Commons extmetadata to an accepted SPDX-style id, or None."""
    code = (meta.get("License", {}).get("value") or "").strip().lower()
    short = (meta.get("LicenseShortName", {}).get("value") or "").strip().lower()
    if code in ACCEPTED:
        return ACCEPTED[code]
    if short in {"cc0", "cc-zero", "cc0 1.0"}:
        return "CC0-1.0"
    if short in {"public domain", "pd"}:
        return "PDM-1.0"
    return None


def candidates(search: str, limit: int = 12) -> list[dict]:
    data = api({
        "action": "query",
        "generator": "search",
        "gsrsearch": f"{search} filetype:bitmap",
        "gsrnamespace": 6,
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime",
        "iiurlwidth": MAX_EDGE,
    })
    pages = sorted(data.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
    found = []
    for page in pages:
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        license_id = license_of(meta)
        if not license_id or info.get("mime") not in {"image/jpeg", "image/png"}:
            continue
        if min(info.get("width", 0), info.get("height", 0)) < 800:
            continue
        found.append({
            "title": page["title"],
            "license": license_id,
            "author_name": plain(meta.get("Artist", {}).get("value")) or "Unknown author",
            "source_page_url": info.get("descriptionurl"),
            "download_url": info.get("thumburl") or info.get("url"),
        })
    return found


def compress(raw: bytes) -> bytes:
    from PIL import Image

    with Image.open(io.BytesIO(raw)) as image:
        image = image.convert("RGB")
        image.thumbnail((MAX_EDGE, MAX_EDGE))
        for quality in (86, 80, 74, 68, 62, 56):
            buffer = io.BytesIO()
            image.save(buffer, "JPEG", quality=quality, optimize=True, progressive=True)
            if buffer.tell() <= MAX_BYTES:
                return buffer.getvalue()
        image.thumbnail((1200, 1200))
        buffer = io.BytesIO()
        image.save(buffer, "JPEG", quality=70, optimize=True)
        return buffer.getvalue()


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def verify() -> int:
    if not MANIFEST.exists():
        print("No manifest yet.")
        return 0
    entries = json.loads(MANIFEST.read_text())["photos"]
    problems = 0
    for entry in entries:
        path = TARGET / entry["file"]
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
            print(f"MISMATCH {entry['file']}")
            problems += 1
    print(f"{len(entries)} photos checked, {problems} problems.")
    return 1 if problems else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="list accepted candidates without downloading")
    parser.add_argument("--verify", action="store_true", help="check files against ATTRIBUTION.json")
    args = parser.parse_args()
    if args.verify:
        return verify()

    TARGET.mkdir(parents=True, exist_ok=True)
    photos, used = [], set()
    for number, (key, title, search, tags) in enumerate(SUBJECTS, start=1):
        try:
            options = [c for c in candidates(search) if c["title"] not in used]
        except OSError as error:
            print(f"Cannot reach Wikimedia Commons ({error}). Allow commons.wikimedia.org and upload.wikimedia.org.", file=sys.stderr)
            return 2
        if not options:
            print(f"skip {key}: no CC0/public-domain candidate")
            continue
        choice = options[0]
        used.add(choice["title"])
        print(f"{key}: {choice['title']} [{choice['license']}] by {choice['author_name']}")
        if args.dry_run:
            continue
        data = compress(download(choice["download_url"]))
        file_name = f"{number:02d}-{key}.jpg"
        (TARGET / file_name).write_bytes(data)
        photos.append({
            "file": file_name,
            "key": key,
            "title": title,
            "tags": tags,
            "source": "Wikimedia Commons",
            "source_title": choice["title"],
            "source_page_url": choice["source_page_url"],
            "source_url": choice["download_url"],
            "author_name": choice["author_name"],
            "license": choice["license"],
            "license_url": LICENSE_URLS[choice["license"]],
            "sha256": hashlib.sha256(data).hexdigest(),
            "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        })
    if not args.dry_run:
        MANIFEST.write_text(json.dumps({"schema": "teckstudio-attribution/v1", "category": "real-estate", "photos": photos}, indent=2) + "\n")
        print(f"Wrote {len(photos)} photos and {MANIFEST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
