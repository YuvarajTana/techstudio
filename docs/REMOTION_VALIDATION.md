# Remotion implementation validation

Validated September 11, 2026 against this source folder, which has no Git history. This supplements the historical [September 6 review](VALIDATION.md). Actual commands and user flows are in [Create lesson videos locally](REMOTION_LOCAL_GUIDE.md).

## Environment and results

Apple Silicon macOS; Node 24.19.0, React 19.2.7, TypeScript 6.0.2, Vite 8.1.0, Remotion packages 4.0.523, Chrome Headless Shell 149.0.7790.0, Python 3.12, MySQL 9.3.0 and FFmpeg 9.0.1. Root `package-lock.json` and `backend/requirements-local.lock` record dependencies.

| Check | Result and scope |
|---|---|
| Production build | `npm run build` passed: existing frontend plus shared packages and renderer type checks |
| Blocking frontend lint | `npm run lint --workspace frontend -- --quiet` passed |
| Contract/compiler/runtime tests | `npm run test:video`: 3 tests passed, including exact boundaries, arbitrary frame order, invalid references/timing/options and bundle path rejection |
| Editor interactions with actual Player | `npm run test:lesson-ui`: edit/save-before-render, invalid timing and save-conflict preservation passed in JSDOM using the real Remotion Player and composition |
| Focused backend suite | 37 tests and 4 subtests passed across lesson-video, legacy video-render service, project-versioning and upload-service tests |
| Real database migration | Additive lesson document/snapshot/worker/job migration applied to the managed MySQL database; subsequent stack restarts succeeded |
| CLI render | Full five-scene MP4 generated locally, probed as H.264, 1920×1080, 30 fps, 1,620 frames, 54 seconds; poster and manifest created |
| Visual output | Native title poster plus success, failure, question and recap frames inspected; additional six-node scene with long labels inspected |
| Local asset independence | Five-second native render succeeded with the render browser's outbound proxy and external DNS blocked, while loopback was allowed; packaged fonts used and hashed |
| Platform flow on MySQL | Create, edit, revision conflict, concurrent duplicate submission, real render, owned MP4/poster/manifest downloads and cross-account denial passed |
| Queue lifecycle | Cancellation, active-render project deletion guard, immutable snapshots, stale lease rejection and bounded expiry retries covered; real worker interruption recovered and completed on attempt 2 |
| Persistence | Saved lesson reopened after full launcher restart; disposable lesson trash/restore preserved its spec and revision |
| Existing product | `scripts/verify_local.py` passed again: auth, exact project save/reload, templates/assets/brand, upload, unauthorized rejection, 12-frame FFmpeg MP4 and revoked logout token |
| Dependency lock consistency | `npm ci --dry-run --offline --ignore-scripts` passed; this was a dry run, not a second clean installation |

The MySQL concurrent-submission check found a repeatable-read transaction issue during development: an ordinary read after waiting for the project lock could still see a stale snapshot. Document and idempotency lookups now use current locking reads. The real concurrent check passed after the fix.

## Reproduce the checks

Run from the root after installing dependencies:

```bash
npm run build
npm run lint --workspace frontend -- --quiet
npm run test:video
npm run test:lesson-ui
.venv/bin/python -m pytest backend/test_lesson_video.py backend/test_video_render_service.py backend/test_project_versioning.py backend/test_upload_service.py -q
```

With the managed local stack running:

```bash
.venv/bin/python scripts/verify_local.py
.venv/bin/python scripts/verify_lesson_video.py
.venv/bin/python scripts/verify_lesson_video.py --reopen
```

These smoke scripts create named verification accounts/projects in the isolated `teckstudio_local` database on port 3307. They reject another database configuration. Demo credentials stay private in `.local/demo-account.json`; never publish that file. The lesson smoke leaves `.local/lesson-smoke.json` with project/job identifiers and `.local/lesson-platform.mp4` with the authenticated download.

To test interruption, run `--submit-recovery` and immediately stop the launcher while the job is processing. Start the stack again, then run `--resume`. The script requires completion at attempt 2 or later; a first attempt that already finished does not count as recovery evidence.

```bash
.venv/bin/python scripts/verify_lesson_video.py --submit-recovery
./scripts/stop_local.sh
./scripts/start_local.sh
# In another terminal after restart:
.venv/bin/python scripts/verify_lesson_video.py --resume
```

For the local-asset render check:

```bash
node --import tsx scripts/verify_offline_video.ts
```

This prepares the installed runtime first, then blocks external networking in the render browser. It is not a test with the entire computer disconnected from the internet. Results and font hashes are recorded in `.local/offline-video-results.json`.

## Evidence and boundaries

The final 54-second CLI render took **27.95 seconds wall time** and produced an **874,563-byte MP4**. macOS `/usr/bin/time -l` reported **646,234,112 bytes maximum resident set size** for that command. This is one warm-cache observation with other development checks running, not aggregate process-tree memory sampling or a throughput guarantee. The worker renders one job at a time with two frame-rendering tasks; longer or more complex lessons need their own measurement.

Native render evidence is under `.local/video-artifacts/api-request-final.mp4` with its poster and manifest. Representative sample frames are assembled in `.local/video-artifacts/lesson-contact-sheet.png`. Platform verification and interrupted-job details are under `.local/lesson-smoke.json` and `.local/lesson-recovery.json`. These generated files are ignored by version control.

JSDOM checks real component behavior but cannot prove responsive layout, browser media controls, or a complete click-through in a real browser. Browser inspection permission was declined during the earlier review and was not retried. A live browser walkthrough remains unverified. Native video frames were inspected separately.

The build still reports existing large-chunk and mixed dynamic/static-import warnings. The lesson editor is a separate lazy chunk; this change does not resolve the existing large main bundle. Backend tests report 109 deprecation warnings in framework/model/time APIs. The JSDOM Player reports unavailable AudioContext and the standard Remotion license notice; the supported lesson is silent.

Linux/Windows setup, ten-minute or dense maximum-size lessons, commercial deployment, external AI providers, narration and captions were not validated. Render determinism means the same frame plan and scene state; byte-identical MP4 output across machines is not promised. Remotion's installed license is recorded with the dependency, without acknowledging eligibility on the user's behalf.
