#!/usr/bin/env bash
# Tartanak startup script — starts all internal services.
#
# Usage:
#   bash start.sh           start all services
#   bash start.sh --check   health check only
#   bash start.sh --stop    stop all services
#
# Environment variables:
#   APP_PORT         Single unified port (default: 8080, required for Docker)
#   NEXT_PORT        Next.js dev server       (default: 3000)
#   ANNOTATOR_PORT   UI Annotator             (default: 7077)
#   GATEWAY_PORT     Tartanak gateway         (default: 18789)
#   GATEWAY_TOKEN    Gateway auth token       (default: tartanak-secret)
#   ALLOWED_ORIGINS  Extra hostnames for Next.js (comma-separated)
#   EDITOR_PASSWORD  Editor password          (default: none)
#   BASE_PATH        URL prefix               (default: "")

set -euo pipefail

WORK_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$WORK_DIR/website"
GATEWAY_MJS="$WORK_DIR/tartanak.mjs"
[[ ! -f "$GATEWAY_MJS" ]] && GATEWAY_MJS="$WORK_DIR/gateway/tartanak.mjs"
# Support tartanak:latest image layout (/app/tartanak.mjs)
[[ ! -f "$GATEWAY_MJS" ]] && GATEWAY_MJS="$WORK_DIR/tartanak.mjs"

# ── Ports ────────────────────────────────────────────────────────────────────
APP_PORT="${APP_PORT:-8080}"
NEXT_PORT="${NEXT_PORT:-3000}"
ANNOTATOR_PORT="${ANNOTATOR_PORT:-7077}"
GATEWAY_PORT="${GATEWAY_PORT:-18789}"
GATEWAY_TOKEN="${GATEWAY_TOKEN:-tartanak-secret}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"
BASE_PATH="${BASE_PATH:-}"

CHECK_ONLY=false; STOP_ONLY=false
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true
[[ "${1:-}" == "--stop"  ]] && STOP_ONLY=true

log() { echo "[tartanak] $*"; }
ok()  { echo "  ✓ $*"; }
err() { echo "  ✗ $*" >&2; }

# ── Stop ─────────────────────────────────────────────────────────────────────
stop_services() {
  log "Stopping services..."
  for port in "$APP_PORT" "$NEXT_PORT" "$ANNOTATOR_PORT" "$GATEWAY_PORT"; do
    local pids; pids=$(lsof -ti:"$port" 2>/dev/null || true)
    [[ -n "$pids" ]] && { kill -9 $pids 2>/dev/null || true; log "  killed :$port"; }
  done
  pgrep -f "next dev" | xargs kill -9 2>/dev/null || true
  log "All services stopped."
}
$STOP_ONLY && { stop_services; exit 0; }

# ── Health check ─────────────────────────────────────────────────────────────
health_check() {
  local all_ok=true
  _chk() { local label="$1" url="$2"
    if curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -qE '^[23]'; then
      ok "$label: up"
    else err "$label: not responding"; all_ok=false; fi
  }
  _chk "Next.js (:${NEXT_PORT})"       "http://localhost:${NEXT_PORT}/"
  _chk "Annotator (:${ANNOTATOR_PORT})" "http://localhost:${ANNOTATOR_PORT}/"
  _chk "Gateway (:${GATEWAY_PORT})"     "http://localhost:${GATEWAY_PORT}/"
  _chk "App proxy (:${APP_PORT})"       "http://localhost:${APP_PORT}/"
  $all_ok && return 0 || return 1
}
$CHECK_ONLY && { log "Health check:"; health_check; exit $?; }

# ── Prerequisites ─────────────────────────────────────────────────────────────
log "Checking prerequisites..."
NODE_VER=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
[[ "$NODE_VER" -lt 22 ]] && { err "Node.js ≥22 required (found: $(node --version 2>/dev/null || echo none))"; exit 1; }
ok "Node.js $(node --version)"

[[ ! -d "$APP_DIR/node_modules" ]] && { log "Installing deps..."; cd "$APP_DIR" && npm install; cd "$WORK_DIR"; }
ok "Dependencies installed"
mkdir -p "$WORK_DIR/logs"

# ── Stop stale, clear Next.js cache ──────────────────────────────────────────
stop_services; sleep 1
log "Clearing stale Next.js build artifacts..."
rm -rf "$APP_DIR/.next/server" "$APP_DIR/.next/static" "$APP_DIR/.next/BUILD_ID" \
       "$APP_DIR/.next/build-manifest.json" "$APP_DIR/.next/app-build-manifest.json" \
       "$APP_DIR/.next/react-loadable-manifest.json" "$APP_DIR/.next/routes-manifest.json" \
       2>/dev/null || true

# ── Start Next.js ─────────────────────────────────────────────────────────────
log "Starting Next.js on :${NEXT_PORT}..."
cd "$APP_DIR"
PORT="${NEXT_PORT}" HOSTNAME=0.0.0.0 ALLOWED_ORIGINS="${ALLOWED_ORIGINS}" \
  npm run dev -- -H 0.0.0.0 -p "${NEXT_PORT}" >> "$WORK_DIR/logs/nextjs.log" 2>&1 &
cd "$WORK_DIR"
log "  waiting for Next.js..."
for i in $(seq 1 30); do
  curl -sf http://localhost:"${NEXT_PORT}"/ -o /dev/null 2>/dev/null && break; sleep 1
done; sleep 3; ok "Next.js ready"

# ── Start UI Annotator ────────────────────────────────────────────────────────
log "Starting Annotator on :${ANNOTATOR_PORT}..."
npx --yes @mcpware/ui-annotator --port "${ANNOTATOR_PORT}" >> "$WORK_DIR/logs/annotator.log" 2>&1 &
sleep 2; ok "Annotator started"

# ── Start Tartanak Gateway ────────────────────────────────────────────────────
log "Starting Tartanak Gateway on :${GATEWAY_PORT}..."
TARTANAK_GATEWAY_TOKEN="${GATEWAY_TOKEN}" \
TARTANAK__GATEWAY__AUTH__TOKEN="${GATEWAY_TOKEN}" \
TARTANAK__GATEWAY__AUTH__MODE="token" \
  node "$GATEWAY_MJS" gateway run \
    --allow-unconfigured \
    --bind loopback \
    --port "${GATEWAY_PORT}" \
    --token "${GATEWAY_TOKEN}" \
    >> "$WORK_DIR/logs/gateway.log" 2>&1 &
log "  waiting for gateway..."
for i in $(seq 1 15); do
  curl -sf http://localhost:"${GATEWAY_PORT}"/ -o /dev/null 2>/dev/null && break; sleep 1
done; sleep 1; ok "Gateway started"

# ── Start Unified Proxy ───────────────────────────────────────────────────────
log "Starting unified proxy on :${APP_PORT}..."
APP_PORT="${APP_PORT}" \
NEXT_PORT="${NEXT_PORT}" \
ANNOTATOR_PORT="${ANNOTATOR_PORT}" \
GATEWAY_PORT="${GATEWAY_PORT}" \
BASE_PATH="${BASE_PATH}" \
TARTANAK_CLI="${GATEWAY_MJS}" \
WORKSPACE_DIR="${APP_DIR}" \
EDITOR_PASSWORD="${GATEWAY_TOKEN}" \
  node "$APP_DIR/scripts/public-port-proxies.mjs" >> "$WORK_DIR/logs/proxy.log" 2>&1 &
sleep 2; ok "Proxy started"

# ── Health check ──────────────────────────────────────────────────────────────
log ""; log "Running health check..."
sleep 3
if health_check; then
  log ""
  log "════════════════════════════════════════════════"
  log " All services running on port ${APP_PORT}"
  log "────────────────────────────────────────────────"
  log " Website:   http://localhost:${APP_PORT}/"
  log " Dashboard: http://localhost:${APP_PORT}/tartanak/"
  log " Editor:    http://localhost:${APP_PORT}/tartanak/edit/localhost:${NEXT_PORT}"
  log "────────────────────────────────────────────────"
  log " Logs: $WORK_DIR/logs/"
  log "════════════════════════════════════════════════"
else
  err "Some services unhealthy — check $WORK_DIR/logs/"
  exit 1
fi
