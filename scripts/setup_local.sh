#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for binary in node npm mysqld mysql ffmpeg; do
  if ! command -v "$binary" >/dev/null 2>&1; then
    echo "Missing $binary. See docs/LOCAL_SETUP.md for prerequisites." >&2
    exit 1
  fi
done
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (!(major > 22 || (major === 22 && minor >= 12))) { console.error("Use Node 22.12+ or Node 24 LTS."); process.exit(1); }'

PYTHON_BIN="${TECKSTUDIO_PYTHON:-}"
if [ -z "$PYTHON_BIN" ]; then
  for candidate in python3.12 python3.11 python3.13 python3; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; raise SystemExit(sys.version_info < (3, 10))'; then
      PYTHON_BIN="$(command -v "$candidate")"
      break
    fi
  done
fi
if [ -z "$PYTHON_BIN" ]; then
  echo 'Python 3.10+ is required; Python 3.12 is recommended.' >&2
  exit 1
fi
"$PYTHON_BIN" -m venv .venv
.venv/bin/python -m pip install --cache-dir .local/pip-cache -r backend/requirements-local.lock
npm ci --cache .local/npm-cache --no-audit --no-fund
npm run video:prepare
.venv/bin/python scripts/local_stack.py init
echo 'Setup complete. Run: ./scripts/start_local.sh'
