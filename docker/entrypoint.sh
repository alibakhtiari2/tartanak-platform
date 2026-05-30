#!/usr/bin/env bash
# Container entrypoint — seeds config, starts all services, self-heals.
set -euo pipefail

WORK_DIR="/app"
GATEWAY_CONFIG="/home/node/.tartanak/tartanak.json"
DOMAIN="${DOMAIN:-localhost}"

log() { echo "[entrypoint] $*"; }

# ── 1. Write Next.js .env ─────────────────────────────────────────────────────
ENV_FILE="$WORK_DIR/website/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  log "Writing $ENV_FILE..."
  cat > "$ENV_FILE" << EOF
GMAIL_USER=${GMAIL_USER:-}
GMAIL_APP_PASSWORD=${GMAIL_APP_PASSWORD:-}
EMAIL_FROM=${EMAIL_FROM:-}
EMAIL_TEST_SECRET=${EMAIL_TEST_SECRET:-$(openssl rand -hex 16)}
HUB_SECRET=${HUB_SECRET:-$(openssl rand -hex 32)}
ACCOUNTING_API_URL=${ACCOUNTING_API_URL:-}
ACCOUNTING_API_KEY=${ACCOUNTING_API_KEY:-}
EOF
fi

# ── 2. Seed tartanak.json ─────────────────────────────────────────────────────
# MUST be the JSON file — env vars are ignored for WebSocket origin checks.
mkdir -p /home/node/.tartanak

CURRENT_DOMAIN=$(python3 -c "
import json
try:
  d = json.load(open('$GATEWAY_CONFIG'))
  origins = d.get('gateway', {}).get('controlUi', {}).get('allowedOrigins', [])
  domain = '$DOMAIN'
  print(domain if any(domain in o for o in origins) else '')
except:
  print('')
" 2>/dev/null || echo "")

if [[ ! -f "$GATEWAY_CONFIG" ]] || [[ "$CURRENT_DOMAIN" != "$DOMAIN" ]]; then
  log "Seeding gateway config for domain: $DOMAIN"
  python3 - << PYEOF
import json, os
cfg = {
  "gateway": {
    "mode": "local",
    "bind": "loopback",
    "controlUi": {
      "allowedOrigins": [
        "https://" + os.environ["DOMAIN"],
        "http://"  + os.environ["DOMAIN"]
      ]
    },
    "trustedProxies": ["172.0.0.0/8", "10.0.0.0/8", "192.168.0.0/16", "127.0.0.1"]
  },
  "agents": {
    "defaults": {
      "workspace": "/home/node/.tartanak/workspace-dev",
      "skipBootstrap": True
    },
    "list": [{
      "id": "dev",
      "default": True,
      "workspace": "/home/node/.tartanak/workspace-dev",
      "identity": {
        "name": "Tartanak AI",
        "theme": "helpful assistant",
        "emoji": "🤖"
      }
    }]
  },
  "meta": {
    "lastTouchedVersion": "2026.5.6"
  }
}
json.dump(cfg, open("$GATEWAY_CONFIG", "w"), indent=2)
print("[entrypoint] Gateway config written ✓")
PYEOF
fi

# ── 3. Start all services ─────────────────────────────────────────────────────
log "Starting services (domain=${DOMAIN} port=${APP_PORT:-8080})..."
bash "$WORK_DIR/start.sh" || true

_shutdown() { log "Shutting down..."; bash "$WORK_DIR/start.sh" --stop; exit 0; }
trap _shutdown TERM INT

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log " https://${DOMAIN}/"
log " https://${DOMAIN}/tartanak/   (dashboard)"
log " https://${DOMAIN}/tartanak/edit/"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 4. Self-healing loop ──────────────────────────────────────────────────────
FAIL=0
while true; do
  sleep 30
  if bash "$WORK_DIR/start.sh" --check > /dev/null 2>&1; then
    FAIL=0
  else
    FAIL=$((FAIL+1))
    log "Health check failed ($FAIL/2)..."
    [[ $FAIL -ge 2 ]] && { bash "$WORK_DIR/start.sh" >> "$WORK_DIR/logs/restart.log" 2>&1 || true; FAIL=0; }
  fi
done
