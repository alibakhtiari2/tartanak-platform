#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Tartanak Platform — One-line installer
#
#  Usage:
#    curl -fsSL https://raw.githubusercontent.com/alibakhtiari2/tartanak-platform/main/install.sh \
#      | bash -s -- SUBDOMAIN [TOKEN] [EMAIL]
#
#  Examples:
#    ... | bash -s -- myshop
#    ... | bash -s -- myshop mysecretpassword
#    ... | bash -s -- myshop mysecretpassword ssl@mycompany.com
#
#  What it does:
#    1. Installs Docker (if missing)
#    2. Installs Traefik (if missing) — handles SSL automatically
#    3. Pulls the platform image
#    4. Starts the instance with correct gateway config pre-seeded
#    5. Prints the live URLs and dashboard token
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

readonly IMAGE="${TARTANAK_IMAGE:-ghcr.io/alibakhtiari2/tartanak-platform:latest}"
readonly BASE_DOMAIN="${BASE_DOMAIN:-tartanak.com}"
readonly INSTANCES_DIR="${INSTANCES_DIR:-/opt/tartanak/instances}"
readonly TRAEFIK_DIR="${TRAEFIK_DIR:-/opt/tartanak/traefik}"

# ── Args ──────────────────────────────────────────────────────────────────────
SUBDOMAIN="${1:?Usage: install.sh SUBDOMAIN [TOKEN] [EMAIL]}"
TOKEN="${2:-}"
ACME_EMAIL="${3:-admin@${BASE_DOMAIN}}"
DOMAIN="${SUBDOMAIN}.${BASE_DOMAIN}"

# Auto-generate token if not provided
if [[ -z "$TOKEN" ]]; then
  TOKEN=$(openssl rand -base64 18 | tr -d '/+=')
  echo ""
  echo "  🔑  Auto-generated token: ${TOKEN}"
  echo "  (you can also pass your own: install.sh ${SUBDOMAIN} mypassword)"
  echo ""
fi

# ── Colours ───────────────────────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' C='\033[0;36m' B='\033[1m' NC='\033[0m'
info()    { echo -e "${C}[install]${NC} $*"; }
success() { echo -e "${G}[install]${NC} ✓ $*"; }
warn()    { echo -e "${Y}[install]${NC} ⚠ $*"; }
die()     { echo -e "${R}[install]${NC} ✗ $*" >&2; exit 1; }
step()    { echo -e "\n${B}── $* ${NC}"; }

# ── Must be root ──────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && die "Run as root: sudo bash -s -- ${SUBDOMAIN} ${TOKEN}"

step "1/6  Docker"
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  success "Docker installed"
else
  success "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1) already installed"
fi
docker info &>/dev/null || die "Docker daemon not running — try: systemctl start docker"

step "2/6  Traefik (reverse proxy + automatic SSL)"
# Create shared Docker network
docker network create tartanak-web 2>/dev/null && info "Created tartanak-web network" || info "tartanak-web network already exists"

if ! docker ps --format '{{.Names}}' | grep -q "^tartanak-traefik$"; then
  info "Starting Traefik..."
  mkdir -p "$TRAEFIK_DIR"

  # Download Traefik compose file
  curl -fsSL https://raw.githubusercontent.com/alibakhtiari2/tartanak-platform/main/traefik/docker-compose.yml \
    -o "$TRAEFIK_DIR/docker-compose.yml"

  ACME_EMAIL="$ACME_EMAIL" \
    docker compose -f "$TRAEFIK_DIR/docker-compose.yml" up -d

  success "Traefik started — handles SSL for all subdomains automatically"
else
  success "Traefik already running"
fi

step "3/6  Pull platform image"
# Force IPv4 to avoid flaky IPv6 on some providers
echo 'precedence ::ffff:0:0/96 100' >> /etc/gai.conf 2>/dev/null || true
info "Pulling ${IMAGE}..."
docker pull "$IMAGE" || die "Failed to pull ${IMAGE}. If private: docker login ghcr.io"
success "Image ready"

step "4/6  Create instance: ${SUBDOMAIN}"
[[ -d "$INSTANCES_DIR/$SUBDOMAIN" ]] && \
  die "Instance '${SUBDOMAIN}' already exists. Remove first: bash /opt/tartanak/instances/${SUBDOMAIN}/uninstall.sh"

INSTANCE_DIR="$INSTANCES_DIR/$SUBDOMAIN"
mkdir -p "$INSTANCE_DIR"

# Write env
cat > "$INSTANCE_DIR/.env" << ENV
# Instance: ${SUBDOMAIN}
DOMAIN=${DOMAIN}
GATEWAY_TOKEN=${TOKEN}

# Gateway auth (env vars for process; JSON config for WebSocket origin check)
TARTANAK__GATEWAY__AUTH__TOKEN=${TOKEN}
TARTANAK__GATEWAY__AUTH__MODE=token
TARTANAK__GATEWAY__CONTROL_UI__ALLOWED_ORIGINS=https://${DOMAIN},http://${DOMAIN}
TARTANAK__GATEWAY__NODES__PAIRING__AUTO_APPROVE_CIDRS=0.0.0.0/0

# Next.js
APP_PORT=8080
NEXT_PORT=3000
GATEWAY_PORT=18789
ALLOWED_ORIGINS=${DOMAIN}

# Fill in for email/hub features
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

# Write docker-compose with Traefik labels (no port mapping needed!)
cat > "$INSTANCE_DIR/docker-compose.yml" << COMPOSE
services:
  ${SUBDOMAIN}:
    image: ${IMAGE}
    container_name: tartanak-${SUBDOMAIN}
    restart: unless-stopped
    env_file: .env
    environment:
      APP_PORT: "8080"
      DOMAIN: "${DOMAIN}"
      GATEWAY_TOKEN: "${TOKEN}"
    volumes:
      - tartanak-${SUBDOMAIN}-gateway:/home/node/.tartanak
      - tartanak-${SUBDOMAIN}-data:/app/website/.tartanak
    networks:
      - tartanak-web
    labels:
      - "traefik.enable=true"
      # HTTPS
      - "traefik.http.routers.${SUBDOMAIN}.rule=Host(\`${DOMAIN}\`)"
      - "traefik.http.routers.${SUBDOMAIN}.entrypoints=websecure"
      - "traefik.http.routers.${SUBDOMAIN}.tls.certresolver=le"
      - "traefik.http.services.${SUBDOMAIN}.loadbalancer.server.port=8080"
      # WebSocket support (pass Upgrade headers)
      - "traefik.http.middlewares.${SUBDOMAIN}-ws.headers.customrequestheaders.X-Forwarded-Proto=https"
      - "traefik.http.routers.${SUBDOMAIN}.middlewares=${SUBDOMAIN}-ws"
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8080/"]
      interval: 30s
      timeout: 15s
      retries: 3
      start_period: 120s
    logging:
      driver: "json-file"
      options: { max-size: "50m", max-file: "3" }

volumes:
  tartanak-${SUBDOMAIN}-gateway:
  tartanak-${SUBDOMAIN}-data:

networks:
  tartanak-web:
    external: true
COMPOSE

success "Config written → $INSTANCE_DIR"

step "5/6  Start container"
docker compose -f "$INSTANCE_DIR/docker-compose.yml" up -d
info "Waiting for container to be healthy (~60s for first boot)..."

WAITED=0
while [[ $WAITED -lt 150 ]]; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "tartanak-${SUBDOMAIN}" 2>/dev/null || echo "starting")
  [[ "$STATUS" == "healthy" ]] && break
  if [[ "$STATUS" == "unhealthy" ]]; then
    warn "Container unhealthy. Logs:"
    docker logs "tartanak-${SUBDOMAIN}" --tail 20
    die "Container failed to start."
  fi
  echo -n "."
  sleep 3; WAITED=$((WAITED+3))
done
echo ""
[[ $WAITED -ge 150 ]] && warn "Health check timed out — container may still be starting. Check: docker logs tartanak-${SUBDOMAIN} -f"
success "Container running"

step "6/6  Write uninstall script"
cat > "$INSTANCE_DIR/uninstall.sh" << 'UNINSTALL'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
NAME="$(basename "$DIR")"
echo "Removing Tartanak instance: $NAME"
docker compose -f "$DIR/docker-compose.yml" down -v
rm -rf "$DIR"
echo "Done. Remove DNS record for ${NAME}.tartanak.com"
UNINSTALL
chmod +x "$INSTANCE_DIR/uninstall.sh"

# ── Done ──────────────────────────────────────────────────────────────────────
SERVER_IP=$(curl -4s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

echo ""
echo -e "${G}${B}════════════════════════════════════════════════════${NC}"
echo -e "${G}${B} Tartanak '${SUBDOMAIN}' deployed!${NC}"
echo -e "${G}${B}════════════════════════════════════════════════════${NC}"
echo ""
echo -e " 🌐  ${B}https://${DOMAIN}/${NC}                (website)"
echo -e " ⚙️   ${B}https://${DOMAIN}/tartanak/${NC}        (AI dashboard)"
echo -e " ✏️   ${B}https://${DOMAIN}/tartanak/edit/${NC}   (CMS editor)"
echo ""
echo -e " 🔑  Dashboard token: ${B}${TOKEN}${NC}"
echo ""
echo -e " ${Y}⚠  Set DNS:${NC}  ${DOMAIN}  →  ${SERVER_IP}"
echo "    (A record pointing to this server's IP)"
echo ""
echo -e " SSL certificate will be issued automatically by Traefik"
echo "    once DNS is pointing to this server."
echo ""
echo " Manage:"
echo "   docker logs tartanak-${SUBDOMAIN} -f          # live logs"
echo "   docker compose -f ${INSTANCE_DIR}/docker-compose.yml restart"
echo "   bash ${INSTANCE_DIR}/uninstall.sh              # remove"
echo ""
