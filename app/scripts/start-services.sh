#!/usr/bin/env bash
# Starts all Tartanak editor services in the correct order.
# Safe to run repeatedly — kills stale processes first, then starts fresh.
#
# Services:
#   1. Next.js dev server  → port 3000
#   2. UI Annotator        → port 7077
#   3. Proxy (editor+pub)  → port 8077 (editor) + 8100 (public)
#
# Run:
#   bash scripts/start-services.sh
#   bash scripts/start-services.sh --check   # health check only, no restart

set -euo pipefail
WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE"

CHECK_ONLY=false
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

log() { echo "[start-services] $*"; }
ok()  { echo "[OK] $*"; }
err() { echo "[ERR] $*" >&2; }

# ── helpers ──────────────────────────────────────────────────────────────────

wait_port() {
  local port=$1 tries=${2:-20} label=${3:-"port $1"}
  for i in $(seq 1 "$tries"); do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/" 2>/dev/null | grep -qE '^[23]'; then
      ok "$label is up"
      return 0
    fi
    sleep 1
  done
  err "$label did not respond after ${tries}s"
  return 1
}

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    log "Killing processes on port $port: $pids"
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
}

# ── health check ─────────────────────────────────────────────────────────────

health_check() {
  local ok=true

  # Next.js: chunks must load (not just the HTML root)
  local v
  v=$(curl -s "http://localhost:3000/" 2>/dev/null | grep -o '?v=[0-9]*' | head -1 | cut -c3-)
  if [[ -z "$v" ]]; then
    err "Next.js: could not get version token from /"
    ok=false
  else
    local chunk_status
    chunk_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/_next/static/chunks/main-app.js?v=${v}" 2>/dev/null)
    if [[ "$chunk_status" == "200" ]]; then
      ok "Next.js: / + chunks OK (v=${v})"
    else
      err "Next.js: chunks return $chunk_status (broken dev/build mix)"
      ok=false
    fi
  fi

  # Annotator
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:7077/localhost:3000/" 2>/dev/null | grep -qE '^[23]'; then
    ok "Annotator (7077): OK"
  else
    err "Annotator (7077): not responding"
    ok=false
  fi

  # Proxy editor
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8077/edit/localhost:3000" 2>/dev/null | grep -qE '^[23]'; then
    ok "Proxy editor (8077): OK"
  else
    err "Proxy editor (8077): not responding"
    ok=false
  fi

  # Proxy chunks through editor proxy (the previously broken path)
  if [[ -n "${v:-}" ]]; then
    local pv
    pv=$(curl -s "http://localhost:8077/edit/localhost:3000" 2>/dev/null | grep -o 'src="/localhost:3000/_next/static/chunks/main-app\.js[^"]*"' | head -1 | sed 's/src="//;s/"//')
    if [[ -n "$pv" ]]; then
      local chunk_proxy_status
      chunk_proxy_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8077${pv}" 2>/dev/null)
      if [[ "$chunk_proxy_status" == "200" ]]; then
        ok "Proxy chunks (8077): OK (JS loads through proxy)"
      else
        err "Proxy chunks (8077): $chunk_proxy_status — JS won't load in browser!"
        ok=false
      fi
    fi
  fi

  # Public proxy
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8100/" 2>/dev/null | grep -qE '^[23]'; then
    ok "Public proxy (8100): OK"
  else
    err "Public proxy (8100): not responding"
    ok=false
  fi

  $ok && return 0 || return 1
}

# ── check-only mode ──────────────────────────────────────────────────────────

if $CHECK_ONLY; then
  log "Health check mode"
  health_check
  exit $?
fi

# ── stop stale services ──────────────────────────────────────────────────────

log "Stopping any stale services..."
kill_port 8100
kill_port 8077
kill_port 7077

# Kill Next.js dev on port 3000
pgrep -f "next dev" | xargs kill -9 2>/dev/null || true
sleep 1

# ── clear broken build artifacts ─────────────────────────────────────────────
# A production `npm run build` while dev was running breaks dev chunks.
# We delete the production artifacts so dev starts clean.
log "Clearing any stale production build artifacts..."
rm -rf \
  .next/server \
  .next/static \
  .next/BUILD_ID \
  .next/build-manifest.json \
  .next/app-build-manifest.json \
  .next/react-loadable-manifest.json \
  .next/routes-manifest.json \
  .next/export-marker.json \
  2>/dev/null || true
log "Build artifacts cleared"

# ── start Next.js dev ─────────────────────────────────────────────────────────

log "Starting Next.js dev on port 3000..."
PORT=3000 HOSTNAME=0.0.0.0 npm run dev -- -H 0.0.0.0 -p 3000 >> .next-dev-3000.log 2>&1 &
NEXT_PID=$!
log "Next.js PID=$NEXT_PID"

# Wait for Next.js to be ready and compile at least one page
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/" 2>/dev/null | grep -qE '^[23]'; then
    break
  fi
  sleep 1
done
log "Triggering initial compilation..."
curl -s "http://localhost:3000/" > /dev/null 2>&1 || true
sleep 5  # wait for chunks to compile

# Verify chunks are healthy before continuing
V=$(curl -s "http://localhost:3000/" 2>/dev/null | grep -o '?v=[0-9]*' | head -1 | cut -c3- || true)
if [[ -n "$V" ]]; then
  CHUNK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/_next/static/chunks/main-app.js?v=${V}" 2>/dev/null)
  if [[ "$CHUNK_STATUS" != "200" ]]; then
    err "Next.js chunks still broken after restart (status=$CHUNK_STATUS). Trying clean rebuild..."
    kill $NEXT_PID 2>/dev/null || true
    sleep 1
    rm -rf .next 2>/dev/null || true
    PORT=3000 HOSTNAME=0.0.0.0 npm run dev -- -H 0.0.0.0 -p 3000 >> .next-dev-3000.log 2>&1 &
    NEXT_PID=$!
    sleep 10
    curl -s "http://localhost:3000/" > /dev/null 2>&1 || true
    sleep 5
  fi
fi
ok "Next.js dev: ready"

# ── start UI Annotator ────────────────────────────────────────────────────────

log "Starting UI Annotator on port 7077..."
npx --yes @mcpware/ui-annotator --port 7077 >> .ui-annotator-7077.log 2>&1 &
log "Annotator PID=$!"
sleep 3
ok "Annotator: started"

# ── start proxy ───────────────────────────────────────────────────────────────

log "Starting proxy (8077 editor, 8100 public)..."
node scripts/public-port-proxies.mjs >> .public-port-proxies.log 2>&1 &
log "Proxy PID=$!"
sleep 2

# ── final health check ────────────────────────────────────────────────────────

log "Running health check..."
sleep 2
if health_check; then
  log ""
  log "All services up:"
  log "  Public site:  http://localhost:8100/"
  log "  Editor:       http://localhost:8077/edit/localhost:3000"
  log "  Landing:      http://localhost:8077/"
else
  err "Some services are unhealthy — check logs above"
  exit 1
fi
