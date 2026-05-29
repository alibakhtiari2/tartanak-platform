#!/usr/bin/env bash
# Docker container entrypoint.
# Starts all services, keeps alive, self-heals on failure.

set -euo pipefail

WORK_DIR="/app"
ENV_FILE="$WORK_DIR/website/.env"

log() { echo "[entrypoint] $*"; }

# Write .env from environment if not present
if [[ ! -f "$ENV_FILE" ]]; then
  log "Writing $ENV_FILE from environment..."
  cat > "$ENV_FILE" <<EOF
GMAIL_USER=${GMAIL_USER:-}
GMAIL_APP_PASSWORD=${GMAIL_APP_PASSWORD:-}
EMAIL_FROM=${EMAIL_FROM:-}
EMAIL_TEST_SECRET=${EMAIL_TEST_SECRET:-change-me}
EOF
fi

# Start all services
log "Starting Tartanak services (APP_PORT=${APP_PORT:-8080})..."
bash "$WORK_DIR/start.sh"

_shutdown() {
  log "Shutting down..."
  bash "$WORK_DIR/start.sh" --stop
  exit 0
}
trap _shutdown TERM INT

log "Ready → http://0.0.0.0:${APP_PORT:-8080}/"
log "  Website:   /"
log "  Dashboard: /tartanak/"
log "  Editor:    /tartanak/edit/localhost:${NEXT_PORT:-3000}"

# Self-healing: restart if health check fails 2× in a row
FAIL=0
while true; do
  sleep 20
  if bash "$WORK_DIR/start.sh" --check > /dev/null 2>&1; then
    FAIL=0
  else
    FAIL=$((FAIL+1))
    log "Health check failed ($FAIL/2)..."
    if [[ $FAIL -ge 2 ]]; then
      log "Restarting services..."
      bash "$WORK_DIR/start.sh" >> "$WORK_DIR/logs/restart.log" 2>&1 || true
      FAIL=0
    fi
  fi
done
