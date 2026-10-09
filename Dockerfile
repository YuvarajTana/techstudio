# TECKSTUDIO app image: API + built frontend + video and generation workers.
# MySQL runs in its own container (docker-compose.yml). One command: ./scripts/demo.sh
#
# Ubuntu 24.04 gives Python 3.12 (the version this project is tested with) and
# glibc 2.39 (the arm64 render browser needs 2.35+). Node 24 comes from the
# official Node image. BASE_IMAGE lets a network with a TLS-inspecting proxy
# supply a base that trusts its certificate; everyone else keeps the default.
ARG NODE_IMAGE=node:24-bookworm-slim
ARG BASE_IMAGE=ubuntu:24.04
FROM ${NODE_IMAGE} AS node

FROM ${BASE_IMAGE}
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

ENV DEBIAN_FRONTEND=noninteractive
# Python for the API, FFmpeg for canvas video export, and the shared libraries
# Remotion's headless Chromium needs (works on amd64 and arm64).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv ffmpeg ca-certificates fonts-dejavu-core \
      libnss3 libdbus-1-3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements-local.lock backend/requirements-local.lock
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r backend/requirements-local.lock

COPY package.json package-lock.json tsconfig.video.json ./
COPY frontend/package.json frontend/package.json
COPY packages/design-spec/package.json packages/design-spec/package.json
COPY packages/lesson-video/package.json packages/lesson-video/package.json
COPY packages/video-scenes/package.json packages/video-scenes/package.json
COPY renderer/package.json renderer/package.json
RUN npm ci --no-audit --no-fund && npm cache clean --force

COPY . .
# Empty API base = same origin: the API serves this build.
RUN VITE_API_BASE_URL= npm run build --workspace frontend
# Download the render browser and build the video bundle now, so the container
# starts offline. The worker key is created per deployment, never baked in.
RUN npm run video:prepare && rm -f .local/video-worker.key

ENV APP_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    FRONTEND_DIST=/app/frontend/dist \
    INTERNAL_API_LOOPBACK_ONLY=true \
    ENABLE_POLLINATIONS_FALLBACK=false \
    PATH=/opt/venv/bin:$PATH

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=180s --retries=5 \
  CMD python3 -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=4).status == 200 else 1)"
CMD ["python3", "-u", "scripts/container_stack.py"]
