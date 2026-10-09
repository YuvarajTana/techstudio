#!/usr/bin/env bash
# One command to run TECKSTUDIO for a demo, locally or on a cloud server.
#
#   ./scripts/demo.sh          create secrets (first time), build, start, print the login
#   ./scripts/demo.sh status   is everything up?
#   ./scripts/demo.sh logs     follow the app logs
#   ./scripts/demo.sh stop     stop (data is kept)
#   ./scripts/demo.sh reset    delete ALL demo data (asks first)
#
# Needs only Docker (Docker Desktop on macOS/Windows). Settings and secrets live in
# .env.docker (git-ignored). See docs/DEPLOY.md for cloud servers and HTTPS.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=.env.docker
command="${1:-up}"

say() { printf '\033[1m%s\033[0m\n' "$*"; }
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Install Docker Desktop (macOS/Windows) or Docker Engine (Linux): https://docs.docker.com/get-docker/"
docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start Docker Desktop (or the docker service) and try again."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is missing. Update Docker Desktop, or install the docker-compose-plugin."

# `tr` stops with SIGPIPE once `head` has enough; that is expected, not an error.
random_secret() { (LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom 2>/dev/null || true) | head -c "${1:-40}"; }

create_env() {
  [ -f "$ENV_FILE" ] && return
  say "Creating $ENV_FILE with new random secrets (kept private, never committed)…"
  umask 077
  cat >"$ENV_FILE" <<EOF
# TECKSTUDIO Docker settings. Created by scripts/demo.sh; keep this file private.
DB_PASSWORD=$(random_secret 32)
DB_ROOT_PASSWORD=$(random_secret 32)
JWT_SECRET=$(random_secret 64)
WORKER_SECRET=$(random_secret 64)

# Where the app listens. 127.0.0.1 = this computer only; 0.0.0.0 = your network.
APP_PORT=8080
BIND_ADDRESS=127.0.0.1

# Cloud HTTPS: your domain (DNS A record → this server). Empty = no HTTPS proxy.
DOMAIN=

# Demo login created on first start.
DEMO_NAME=Demo User
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=$(random_secret 16)

# Only behind a TLS-inspecting proxy: an Ubuntu 24.04 base image that trusts it.
# BASE_IMAGE=

# Optional AI providers (leave empty for a manual-design demo).
GEMINI_API_KEY=
OPENAI_API_KEY=
STABILITY_API_KEY=
UNSPLASH_ACCESS_KEY=
EOF
}

setting() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -1; }

compose() {
  local profiles=()
  [ -n "$(setting DOMAIN)" ] && profiles=(--profile https)
  # ${a[@]+...} keeps macOS's bash 3.2 happy with an empty array under `set -u`.
  docker compose --env-file "$ENV_FILE" ${profiles[@]+"${profiles[@]}"} "$@"
}

app_url() {
  local domain port
  domain="$(setting DOMAIN)"
  port="$(setting APP_PORT)"
  if [ -n "$domain" ]; then echo "https://$domain"; else echo "http://127.0.0.1:${port:-8080}"; fi
}

local_api() { echo "http://127.0.0.1:$(setting APP_PORT)"; }

wait_until_ready() {
  local api deadline
  api="$(local_api)"
  deadline=$((SECONDS + 600))
  printf 'Waiting for the database, API and video worker'
  until curl -fsS "$api/api/health/lesson-video" 2>/dev/null | grep -q '"online": *true'; do
    if [ $SECONDS -gt $deadline ]; then
      echo
      fail "TECKSTUDIO did not become ready in 10 minutes. See: ./scripts/demo.sh logs"
    fi
    if [ "$(docker inspect -f '{{.State.Status}}' teckstudio-app-1 2>/dev/null)" = "restarting" ]; then
      echo
      fail "The app container keeps restarting. See: ./scripts/demo.sh logs"
    fi
    printf '.'
    sleep 3
  done
  echo ' ready.'
}

ensure_demo_account() {
  local api email password name body
  api="$(local_api)"
  email="$(setting DEMO_EMAIL)"
  password="$(setting DEMO_PASSWORD)"
  name="$(setting DEMO_NAME)"
  body=$(printf '{"name":"%s","email":"%s","password":"%s"}' "$name" "$email" "$password")
  if curl -fsS -H 'Content-Type: application/json' -d "$body" "$api/api/auth/login" >/dev/null 2>&1; then return; fi
  curl -fsS -H 'Content-Type: application/json' -d "$body" "$api/api/auth/register" >/dev/null \
    || fail "Could not create the demo login $email. If you changed DEMO_PASSWORD, log in with the old one or run ./scripts/demo.sh reset."
}

# True when something accepts connections on 127.0.0.1:$1 (bash's /dev/tcp; works on macOS bash 3.2).
port_in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

# True when our own running app container already publishes this port (a re-run).
port_is_ours() { docker port teckstudio-app-1 8080 2>/dev/null | grep -q ":$1\$"; }

set_setting() {
  # Portable in-place edit (BSD and GNU sed differ on -i).
  local tmp
  tmp="$(mktemp)"
  sed "s/^$1=.*/$1=$2/" "$ENV_FILE" >"$tmp" && cat "$tmp" >"$ENV_FILE" && rm -f "$tmp"
}

# If another program holds APP_PORT, move to the next free port and remember it.
choose_port() {
  local port candidate
  port="$(setting APP_PORT)"
  port="${port:-8080}"
  if ! port_in_use "$port" || port_is_ours "$port"; then return; fi
  for candidate in $(seq $((port + 1)) $((port + 20))); do
    if ! port_in_use "$candidate"; then
      say "Port $port is used by another program; using $candidate instead (saved in $ENV_FILE)."
      if command -v lsof >/dev/null 2>&1; then
        lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print "  (port " P " is held by: " $1 ", pid " $2 ")"}' P="$port"
      fi
      set_setting APP_PORT "$candidate"
      return
    fi
  done
  fail "Ports $port–$((port + 20)) are all in use. Set APP_PORT in $ENV_FILE to a free port."
}

open_browser() {
  [ -n "${CI:-}${NO_OPEN:-}" ] && return
  if command -v open >/dev/null 2>&1; then open "$1" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1 || true
  fi
}

case "$command" in
  up | start)
    create_env
    choose_port
    say "Building and starting TECKSTUDIO (the first build downloads ~1–2 GB and takes 5–15 minutes)…"
    compose up -d --build
    wait_until_ready
    ensure_demo_account
    url="$(app_url)"
    echo
    say "TECKSTUDIO is running: $url"
    echo "  Login:     $(setting DEMO_EMAIL)"
    echo "  Password:  $(setting DEMO_PASSWORD)"
    echo "  Start at:  $url/design   (Design Studio)"
    echo "  API docs:  $(local_api)/docs"
    echo
    echo "Stop with ./scripts/demo.sh stop (your designs are kept). Demo script: docs/CLIENT_DEMO.md"
    open_browser "$url/login"
    ;;
  status)
    [ -f "$ENV_FILE" ] || fail "Not set up yet. Run ./scripts/demo.sh"
    compose ps
    api="$(local_api)"
    for check in /health /api/health/database /api/health/lesson-video /api/health/local-generation; do
      if curl -fsS "$api$check" >/dev/null 2>&1; then echo "ok    $check"; else echo "DOWN  $check"; fi
    done
    ;;
  logs)
    compose logs -f --tail 200 app
    ;;
  stop)
    [ -f "$ENV_FILE" ] || fail "Nothing to stop."
    compose stop
    say "Stopped. Your designs and uploads are kept; start again with ./scripts/demo.sh"
    ;;
  reset)
    [ -f "$ENV_FILE" ] || fail "Nothing to reset."
    printf 'This deletes ALL TECKSTUDIO Docker data (database, uploads, renders). Type "delete" to confirm: '
    read -r answer
    [ "$answer" = "delete" ] || fail "Cancelled; nothing was deleted."
    compose down -v
    say "All Docker data deleted. $ENV_FILE is kept; run ./scripts/demo.sh to start fresh."
    ;;
  *)
    fail "Unknown command '$command'. Use: up | status | logs | stop | reset"
    ;;
esac
