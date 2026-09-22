"""User-run local worker: python backend/local_generation_worker.py [--once]."""

import argparse
import json
import os
import signal
import time
import uuid
from sqlalchemy.exc import SQLAlchemyError

from database import SessionLocal
from services import local_generation


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    owner = f"generation-{uuid.uuid4()}"
    stop = False

    def shutdown(_signal, _frame):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    state = local_generation.ROOT / ".local/generation-worker.json"
    state.parent.mkdir(parents=True, exist_ok=True)
    state.write_text(json.dumps({"pid": os.getpid(), "owner": owner}))
    try:
        while not stop:
            local_generation.worker_heartbeat(owner)
            try:
                with SessionLocal() as db:
                    lease = local_generation.claim(db, owner)
                if lease:
                    local_generation.execute(lease, lambda: stop)
            except SQLAlchemyError:
                if args.once:
                    raise
                print(
                    "Local generation is waiting for its database connection.",
                    flush=True,
                )
                time.sleep(2)
                continue
            if args.once:
                return
            if not lease:
                time.sleep(1)
    finally:
        try:
            if json.loads(state.read_text()).get("owner") == owner:
                state.unlink()
        except (OSError, ValueError):
            pass


if __name__ == "__main__":
    main()
