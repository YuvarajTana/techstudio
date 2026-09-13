# Validation record

Historical September 6 review. See [Remotion implementation validation](REMOTION_VALIDATION.md) for the September 11 implementation, four-service stack and real render checks.

Date: September 6, 2026. Source: the supplied `canva1-main` folder, which does not contain Git metadata. This records observed results; it does not certify every feature in the original README.

## Environment

Apple Silicon macOS; Node 24.19.0, npm 11.17.0, Homebrew Python 3.12, MySQL 9.3.0 and FFmpeg 9.0.1. Runtime Python packages are captured in [requirements-local.lock](../backend/requirements-local.lock). The frontend lockfile used here was migrated to the [root workspace lockfile](../package-lock.json) during the September 11 Remotion implementation.

## Confirmed results

| Check | Result | Boundary |
|---|---|---|
| Dependency installation | Passed | npm ci and Python requirements installed; no package upgrades intentionally made to frontend manifest/lock |
| Isolated database initialization | Passed | Project-owned `.local/mysql`; application DB `teckstudio_local`, port 3307; generated credentials |
| Stack startup | Passed | MySQL → FastAPI startup/schema/seed/migrations → Vite |
| Health endpoints | Passed | Frontend HTTP response, `/health`, `/api/health/database` all ready |
| Full-stack restart persistence | Passed | Stopped all three services, restarted, logged in and reloaded the saved fixture project |
| Managed stop command | Passed | `stop_local.sh` requests graceful shutdown; project data remains on disk |
| Production build | Passed | `npm run build`; output now in `frontend/dist` |
| ESLint | Passed with warnings | 0 errors, 303 warnings; baseline had 4 errors and 303 warnings |
| Template validation | Passed | 65 templates across six frontend categories; 63 AI search results and 4 system-design results reported by the existing validator |
| Focused backend tests | Passed | 67 tests plus 4 subtests: 61 in the initial suite and 6 additional PosterSpec tests |
| Running API smoke check | Passed | Eight check groups listed below; private fixture account and demo project only |
| Actual local FFmpeg encode | Passed | 12 uploaded frames → H.264 MP4, 1080×1350, 24 fps, 0.5 seconds; verified with ffprobe |
| Visual guide static checks | Passed | Unique HTML IDs, valid internal anchors/referenced elements, JS syntax and documentation link integrity |

The 65 validated frontend templates are a different collection from the backend seeded asset library and category tables. Do not combine these counts into one inventory.

### Running API smoke check

[verify_local.py](../scripts/verify_local.py) ran against the already-started local server and confirmed:

1. API and database health.
2. Local registration/login and authenticated profile retrieval.
3. Project creation, update and exact JSON reload from the database.
4. Template/asset reads and brand-kit creation.
5. Upload of an actual PNG image.
6. Rejection of an unauthenticated project read.
7. Frame-job creation, 12-frame multipart upload, finalization, local FFmpeg encode, authenticated download and ffprobe inspection.
8. Session revocation after logout.

The check creates a local test user and clearly named teaching starter/fixture records. It leaves a `Teaching starter — Request lifecycle` project that can be edited. Re-running may add more fixtures. Credentials are stored privately in `.local/demo-account.json`; results are in `.local/smoke-results.json` and the encoding fixture in `.local/smoke-render.mp4`. The fixture is an encoder check, not a finished teaching video. You can register your own account for real work instead.

No cloud AI, paid generation, email or external sharing was used by this smoke script. Its assertions restrict it to the managed local database configuration.

## Reproduce the checks

From the project root, while the local launcher is running:

```bash
.venv/bin/python scripts/local_stack.py status
.venv/bin/python scripts/verify_local.py
.venv/bin/python scripts/verify_local.py --reopen  # after a stack restart
npm --prefix frontend run build
npm --prefix frontend run lint
npm --prefix frontend run validate:templates
```

Run the focused backend suite from `backend`:

```bash
../.venv/bin/python -m pytest -q test_project_versioning.py test_upload_service.py test_video_render_service.py test_ai_provider_contract.py test_poster_analysis.py test_poster_spec.py
```

Use pytest rather than executing every `test_*.py` directly: some files depend on pytest fixtures, and several older scripts call live APIs/providers or leave persistent data. The reviewed suite was intentionally bounded. Do not point old integration scripts at valuable existing databases without inspecting them.

The latest frontend build, lint and template-validation outputs are saved under `.local/`. The first start seeded 27 backend categories and reported 5,004 assets. Startup behavior is implemented in `database.py` and `main.py`; counts are local seed output, not evidence that every asset was visually inspected.

## Remaining limitations

- **Browser access was declined.** No automated click-through, canvas appearance, download-button workflow, microphone flow or responsive screenshot check was completed. User-flow documentation is grounded in source code; HTML validation does not establish visual correctness.
- **Provider generation was not live tested.** No API keys were supplied. Contract tests use controlled mocks. The legacy Gemini model and SDK require maintenance before relying on AI output.
- **Video verification covers the API/encoder path.** It does not verify browser animation capture, a long timeline, audio synchronization, every transition or WebM output.
- **Build warnings remain.** Main application bundle is about 2.21 MB minified / 561 KB gzip, and a dynamic import cannot split the timeline manager because other modules import it statically.
- **Lint warnings remain.** Most relate to `any`, React hook patterns and component structure. Four blocking errors were corrected; no broad editor refactor was attempted.
- **Deprecation warnings remain in Python.** Pydantic settings configuration, SQLAlchemy declarative-base import and naive UTC timestamps need modernization.
- **No full provider/security/load/accessibility audit.** Cross-user sharing permissions and media authorization need dedicated testing before public hosting.
- **No cross-platform certification.** Native launcher behavior was tested on this Mac; Linux/Windows instructions are adaptation guidance.

## Changes made during this review

| Files | Change |
|---|---|
| `scripts/setup_local.sh`, `scripts/start_local.sh`, `scripts/stop_local.sh`, `scripts/local_stack.py` | Repeatable local installation, isolated MySQL, readiness checks and graceful process cleanup |
| `scripts/verify_local.py` | Bounded local API/persistence/upload/encoding smoke checks |
| `backend/requirements-local.lock` | Snapshot of the installed local verification environment, including pytest |
| `frontend/vite.config.ts`, `frontend/.env.example` | Portable Vite defaults and shared environment-driven media/API target |
| `backend/config.py` | SQLAlchemy URL builder handles reserved characters in credentials |
| `VideoExportDialog.tsx`, `useEditorStore.ts`, `technicalReelDesign.ts` | Four existing blocking lint errors removed: overwritten initialization, undocumented empty catch, redundant quote escapes |
| `.gitignore`, `README.md` | Ignore local state and link reviewed startup/teaching instructions |
| New docs and `frontend/public/guide.html` | Visual guide, source-backed product review, teaching recipes and validation record |

The roadmap in [PRODUCT_DEEP_DIVE](PRODUCT_DEEP_DIVE.md) is proposed work. Save-queue improvements, learner rendering, course semantics, new export formats and assessments were not implemented in this review.
