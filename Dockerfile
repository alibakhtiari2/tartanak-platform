# ─────────────────────────────────────────────────────────────────────────────
#  Tartanak Platform — Complete Image
#  Built on tartanak:latest (gateway + AI dashboard) + Next.js website
#
#  One container, one port, three paths:
#    /               → public website (Next.js)
#    /tartanak/      → AI agent dashboard (Tartanak gateway)
#    /tartanak/edit/ → visual CMS editor
# ─────────────────────────────────────────────────────────────────────────────
FROM tartanak:latest

USER root

# Runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl lsof \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install website dependencies (cached layer) ───────────────────────────────
COPY app/package*.json ./website/
RUN cd website \
    && npm ci --omit=dev \
    && npm cache clean --force

# ── Copy website source (no secrets, no state) ───────────────────────────────
COPY app/ ./website/

# Make sure no dev state leaks in
RUN rm -rf \
    website/.env \
    website/memory \
    website/.tartanak \
    website/.ui-edit-agent-runs \
    website/*.jsonl \
    || true

# ── Copy startup scripts ──────────────────────────────────────────────────────
COPY docker/start.sh       ./start.sh
COPY docker/entrypoint.sh  ./entrypoint.sh
RUN chmod +x start.sh entrypoint.sh \
    && mkdir -p logs website/.tartanak/placements

# ── Default environment — ALL overridable at runtime ─────────────────────────
ENV APP_PORT=8080 \
    NEXT_PORT=3000 \
    ANNOTATOR_PORT=7077 \
    GATEWAY_PORT=18789 \
    GATEWAY_TOKEN=change-me \
    BASE_PATH="" \
    ALLOWED_ORIGINS="" \
    EDITOR_PASSWORD="" \
    WORKSPACE_DIR=/app/website \
    TARTANAK_CLI=/app/tartanak.mjs \
    GMAIL_USER="" \
    GMAIL_APP_PASSWORD="" \
    EMAIL_FROM="" \
    EMAIL_TEST_SECRET="" \
    HUB_SECRET="" \
    ACCOUNTING_API_URL="" \
    ACCOUNTING_API_KEY="" \
    NODE_ENV=development

EXPOSE 8080

USER node
ENTRYPOINT ["bash", "/app/entrypoint.sh"]
