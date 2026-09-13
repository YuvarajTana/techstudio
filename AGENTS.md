# TECKSTUDIO agent routing

Custom subagents live in `.cursor/agents/`. For work that touches more than one layer, start with **orchestrator**. That agent splits the job and calls specialists in order: **database → backend → frontend → integration → review**.

| Say this | Agent |
|---|---|
| "Use the orchestrator to …" | Multi-layer feature or cross-stack bug |
| "Use the frontend subagent to …" | React, Vite, Fabric, dashboard, lesson UI |
| "Use the backend subagent to …" | FastAPI routes, auth, jobs, AI proxy |
| "Use the database subagent to …" | SQLAlchemy models, migrations, MySQL, seeds |
| "Use the integration subagent to …" | End-to-end contract / user-flow check |
| "Use the review subagent to …" | Diff review after changes |

Do not start long-running servers; the user runs `./scripts/setup_local.sh` and `./scripts/start_local.sh`. Do not commit unless asked. Never invent secrets — env **names** are in `backend/.env.example` and `frontend/.env.example`.
