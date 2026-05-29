#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Tartanak Platform — One-line installer
#
#  Usage (run on your server):
#    bash <(curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/tartanak-platform/main/finalv1/install.sh) SUBDOMAIN [TOKEN]
#
#  What it does:
#    1. Validates environment (Docker, nginx, certbot)
#    2. Pulls the platform image from ghcr.io
#    3. Picks the next free port
#    4. Creates /opt/tartanak/instances/SUBDOMAIN/
#    5. Starts the container
#    6. Configures nginx vhost
#    7. Issues a Let's Encrypt SSL certificate
#    8. Prints live URLs
#
#  Result:
#    https://SUBDOMAIN.tartanak.com/               → website
#    https://SUBDOMAIN.tartanak.com/tartanak/      → AI dashboard
#    https://SUBDOMAIN.tartanak.com/tartanak/edit/ → visual CMS editor
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
readonly IMAGE="${TARTANAK_IMAGE:-ghcr.io/alibakhtiari2/tartanak-platform:latest}"
readonly BASE_DOMAIN="${BASE_DOMAIN:-tartanak.com}"
readonly INSTANCES_DIR="${INSTANCES_DIR:-/opt/tartanak/instances}"
readonly NGINX_CONF_DIR="${NGINX_CONF_DIR:-/etc/nginx/conf.d}"
readonly PORT_RANGE_START=9001
readonly PORT_RANGE_END=9999

# ── Args ──────────────────────────────────────────────────────────────────────
SUBDOMAIN="${1:?Usage: install.sh SUBDOMAIN [GATEWAY_TOKEN] [EMAIL_FOR_SSL]}"
TOKEN="${2:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)}"
SSL_EMAIL="${3:-admin@${BASE_DOMAIN}}"
DOMAIN="${SUBDOMAIN}.${BASE_DOMAIN}"

# ── Helpers ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[install]${NC} $*"; }
success() { echo -e "${GREEN}[install]${NC} ✓ $*"; }
warn()    { echo -e "${YELLOW}[install]${NC} ⚠ $*"; }
die()     { echo -e "${RED}[install]${NC} ✗ $*" >&2; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
info "Pre-flight checks..."

[[ $EUID -ne 0 ]] && die "Run as root (sudo install.sh ...)"
command -v docker  &>/dev/null || die "Docker not found. Install: curl -fsSL https://get.docker.com | sh"
command -v nginx   &>/dev/null || die "nginx not found. Install: apt install -y nginx"
docker info        &>/dev/null || die "Docker daemon not running"

# Certbot (optional — SSL is skipped if not present)
HAVE_CERTBOT=false
command -v certbot &>/dev/null && HAVE_CERTBOT=true

# Check subdomain isn't already deployed
[[ -d "$INSTANCES_DIR/$SUBDOMAIN" ]] && \
  die "Instance '$SUBDOMAIN' already exists at $INSTANCES_DIR/$SUBDOMAIN. Use uninstall.sh first."

success "Pre-flight OK"

# ── Find next free port ───────────────────────────────────────────────────────
info "Finding free port in range ${PORT_RANGE_START}-${PORT_RANGE_END}..."
PORT=""
for p in $(seq $PORT_RANGE_START $PORT_RANGE_END); do
  if ! ss -tlnp "sport = :${p}" 2>/dev/null | grep -q LISTEN; then
    PORT=$p
    break
  fi
done
[[ -z "$PORT" ]] && die "No free port found in range ${PORT_RANGE_START}-${PORT_RANGE_END}"
success "Using port $PORT"

# ── Pull image ────────────────────────────────────────────────────────────────
info "Pulling image ${IMAGE}..."
docker pull "$IMAGE" || die "Failed to pull $IMAGE — are you logged in? (docker login ghcr.io)"
success "Image ready"

# ── Create instance directory ─────────────────────────────────────────────────
INSTANCE_DIR="$INSTANCES_DIR/$SUBDOMAIN"
mkdir -p "$INSTANCE_DIR"

# ── Write .env ────────────────────────────────────────────────────────────────
info "Writing instance config..."
cat > "$INSTANCE_DIR/.env" << ENV
INSTANCE_NAME=${SUBDOMAIN}
DOMAIN=${DOMAIN}

# Container ports
APP_PORT=8080
NEXT_PORT=3000
GATEWAY_PORT=18789

# Gateway / dashboard auth token (keep secret!)
GATEWAY_TOKEN=${TOKEN}
TARTANAK__GATEWAY__AUTH__TOKEN=${TOKEN}
TARTANAK__GATEWAY__AUTH__MODE=token
TARTANAK__GATEWAY__CONTROL_UI__ALLOWED_ORIGINS=https://${DOMAIN},http://${DOMAIN}
TARTANAK__GATEWAY__NODES__PAIRING__AUTO_APPROVE_CIDRS=0.0.0.0/0

# Next.js cross-origin asset allowance
ALLOWED_ORIGINS=${DOMAIN}

# Fill in after install (email, hub, etc.)
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM=
EMAIL_TEST_SECRET=
HUB_SECRET=
ACCOUNTING_API_URL=
ACCOUNTING_API_KEY=
EDITOR_PASSWORD=
ENV
chmod 600 "$INSTANCE_DIR/.env"

# ── Write docker-compose.yml ──────────────────────────────────────────────────
cat > "$INSTANCE_DIR/docker-compose.yml" << COMPOSE
services:
  ${SUBDOMAIN}:
    image: ${IMAGE}
    container_name: tartanak-${SUBDOMAIN}
    restart: unless-stopped
    ports:
      - "127.0.0.1:${PORT}:8080"
    env_file: .env
    environment:
      APP_PORT: "8080"
    volumes:
      - tartanak-${SUBDOMAIN}-gateway:/home/node/.tartanak
      - tartanak-${SUBDOMAIN}-data:/app/website/.tartanak
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8080/"]
      interval: 30s
      timeout: 15s
      retries: 3
      start_period: 120s
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "3"

volumes:
  tartanak-${SUBDOMAIN}-gateway:
  tartanak-${SUBDOMAIN}-data:
COMPOSE

success "Config written to $INSTANCE_DIR"

# ── Start container ───────────────────────────────────────────────────────────
info "Starting container (this takes ~30s for first boot)..."
docker compose -f "$INSTANCE_DIR/docker-compose.yml" up -d

info "Waiting for health check..."
WAITED=0
while [[ $WAITED -lt 120 ]]; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "tartanak-${SUBDOMAIN}" 2>/dev/null || echo "starting")
  [[ "$STATUS" == "healthy" ]] && break
  [[ "$STATUS" == "unhealthy" ]] && { warn "Container unhealthy — check logs:"; docker logs "tartanak-${SUBDOMAIN}" --tail 30; die "Container failed to start."; }
  sleep 3; WAITED=$((WAITED+3))
  echo -n "."
done
echo ""
[[ $WAITED -ge 120 ]] && warn "Health check timed out (container may still be starting)"
success "Container running on port $PORT"

# ── Configure nginx ───────────────────────────────────────────────────────────
info "Configuring nginx..."
NGINX_CONF="$NGINX_CONF_DIR/tartanak-${SUBDOMAIN}.conf"

cat > "$NGINX_CONF" << NGINX
# Generated by Tartanak install.sh — $(date)
# Instance: ${SUBDOMAIN} | Port: ${PORT}

server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass         http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        client_max_body_size 50M;
    }
}
NGINX

nginx -t && systemctl reload nginx
success "Nginx configured"

# ── SSL via Let's Encrypt ─────────────────────────────────────────────────────
if $HAVE_CERTBOT; then
  info "Requesting SSL certificate for ${DOMAIN}..."
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL" --redirect 2>&1; then
    success "SSL certificate issued"
    PROTOCOL="https"
  else
    warn "SSL failed — continuing without HTTPS. Check DNS and retry: certbot --nginx -d ${DOMAIN}"
    PROTOCOL="http"
  fi
else
  warn "certbot not found — skipping SSL. Install: apt install -y certbot python3-certbot-nginx"
  warn "Then run: certbot --nginx -d ${DOMAIN} --email ${SSL_EMAIL}"
  PROTOCOL="http"
fi

# ── Write uninstall script ────────────────────────────────────────────────────
cat > "$INSTANCE_DIR/uninstall.sh" << 'UNINSTALL'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SUBDOMAIN="$(basename "$SCRIPT_DIR")"
echo "Removing instance: $SUBDOMAIN"
docker compose -f "$SCRIPT_DIR/docker-compose.yml" down -v
rm -f "/etc/nginx/conf.d/tartanak-${SUBDOMAIN}.conf"
nginx -t && systemctl reload nginx
rm -rf "$SCRIPT_DIR"
echo "Done. DNS entry for ${SUBDOMAIN}.tartanak.com can now be removed."
UNINSTALL
chmod +x "$INSTANCE_DIR/uninstall.sh"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} Tartanak instance '${SUBDOMAIN}' is live!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo " 🌐  Website:   ${PROTOCOL}://${DOMAIN}/"
echo " ⚙️   Dashboard: ${PROTOCOL}://${DOMAIN}/tartanak/"
echo " ✏️   Editor:    ${PROTOCOL}://${DOMAIN}/tartanak/edit/localhost:3000"
echo ""
echo " 📁  Config:    ${INSTANCE_DIR}/"
echo " 🔑  Token:     ${TOKEN}"
echo ""
echo " Useful commands:"
echo "   docker logs tartanak-${SUBDOMAIN} -f            # live logs"
echo "   docker compose -f ${INSTANCE_DIR}/docker-compose.yml restart"
echo "   bash ${INSTANCE_DIR}/uninstall.sh               # remove"
echo ""
echo " ⚠  Set DNS: ${DOMAIN} → $(curl -4s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo ""
