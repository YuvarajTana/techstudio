#!/usr/bin/env bash
# One command for the native (non-Docker) stack: set up on first run, then start.
# Needs Node 22.12+, Python 3.10+, MySQL and FFmpeg installed (docs/LOCAL_SETUP.md).
# For a demo without installing those, use ./scripts/demo.sh (Docker) instead.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .local/stack.json ] || [ ! -x .venv/bin/python ]; then
  ./scripts/setup_local.sh
fi
exec ./scripts/start_local.sh
