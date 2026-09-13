#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -x .venv/bin/python ]; then
  echo 'Run ./scripts/setup_local.sh first.' >&2
  exit 1
fi
exec .venv/bin/python -u scripts/local_stack.py start
