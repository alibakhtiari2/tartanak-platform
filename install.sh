#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Tartanak Platform — One-line installer
#
#  Usage:
#    curl -fsSL https://raw.githubusercontent.com/alibakhtiari2/tartanak-platform/main/install.sh \
#      | bash -s -- --subdomain myshop --password mypassword123
#
#  Optional flags:
#    --subdomain  <name>     Subdomain prefix (creates <name>.tartanak.com)
#    --password   <token>    Gateway auth token (auto-generated if omitted)
#    --domain     <fqdn>     Override full domain (default: <subdomain>.tartanak.com)
#    --email      <email>    Let's Encrypt email (default: admin@tartanak.com)
#
#  What it does:
#    1. Installs Docker (if missing)
#    2. Installs Traefik with file provider + Let's Encrypt (if not already running)
#    3. Pulls ghcr.io/alibakhtiari2/tartanak-platform:latest
#    4. Starts the instance container
#    5. Registers the route in Traefik's routes.yml (no container restart needed)
#    6. Waits for healthy and prints live URLs
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

readonly IMAGE="${TARTANAK_IMAGE:-ghcr.io/alibakhtiari2/tartanak-platform:latest}"
readonly BASE_DOMAIN="${BASE_DOMAIN:-tartanak.com}"
readonly TRAEFIK_DIR="${TRAEFIK_DIR:-/opt/tartanak/traefik}"
readonly INSTANCES_DIR="${INSTANCES_DIR:-/opt/tartanak/instances}"
readonly ROUTES_FILE="$TRAEFIK_DIR/dynamic/routes.yml"

# ── Parse args ────────────────────────────────────────────────────────────────
SUBDOMAIN=""
PASSWORD=""
CUSTOM_DOMAIN=""
ACME_EMAIL="admin@${BASE_DOMAIN}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --subdomain) SUBDOMAIN="$2";     shift 2 ;;
    --password)  PASSWORD="$2";      shift 2 ;;
    --domain)    CUSTOM_DOMAIN="$2"; shift 2 ;;
    --email)     ACME_EMAIL="$2";    shift 2 ;;
    # legacy positional support
    -*) echo "Unknown flag: $1"; exit 1 ;;
    *)  [[ -z "$SUBDOMAIN" ]] && SUBDOMAIN="$1" || PASSWORD="$1"; shift ;;
  esac
done

[[ -z "$SUBDOMAIN" ]] && { echo "Usage: install.sh --subdomain myshop [--password mytoken]"; exit 1; }

DOMAIN="${CUSTOM_DOMAIN:-${SUBDOMAIN}.${BASE_DOMAIN}}"
CONTAINER="tartanak-${SUBDOMAIN}"
INSTANCE_DIR="$INSTANCES_DIR/$SUBDOMAIN"

if [[ -z "$PASSWORD" ]]; then
  PASSWORD=$(openssl rand -base64 18 | tr -d '/+=')
  GENERATED_PASSWORD=true
else
  GENERATED_PASSWORD=false
fi

# ── Colours ───────────────────────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' C='\033[0;36m' B='\033[1m' NC='\033[0m'
info()    { echo -e "${C}[install]${NC} $*"; }
success() { echo -e "${G}[install]${NC} ✓ $*"; }
warn()    { echo -e "${Y}[install]${NC} ⚠ $*"; }
die()     { echo -e "${R}[install]${NC} ✗ $*" >&2; exit 1; }
step()    { echo -e "\n${B}── $* ${NC}"; }

[[ $EUID -ne 0 ]] && die "Run as root (sudo) or prefix with: sudo bash -s -- --subdomain ${SUBDOMAIN}"

# ── 1. Docker ─────────────────────────────────────────────────────────────────
step "1/5  Docker"
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  success "Docker installed"
else
  success "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1) already installed"
fi
docker info &>/dev/null || die "Docker daemon not running — try: systemctl start docker"

# ── 2. Traefik (file provider — works on Docker Engine 29+) ──────────────────
step "2/5  Traefik (reverse proxy + automatic SSL)"

docker network create tartanak-web 2>/dev/null && info "Created tartanak-web network" \
  || info "tartanak-web network already exists"

mkdir -p "$TRAEFIK_DIR/dynamic"

# Write Traefik compose (file provider, not Docker provider — avoids API version bug)
cat > "$TRAEFIK_DIR/docker-compose.yml" << 'TRAEFIK_COMPOSE'
services:
  traefik:
    image: traefik:v3.3
    container_name: tartanak-traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - tartanak-traefik-certs:/certs
      - /opt/tartanak/traefik/dynamic:/dynamic:ro
    command:
      - --providers.file.directory=/dynamic
      - --providers.file.watch=true
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      - --certificatesresolvers.le.acme.tlschallenge=true
      - --certificatesresolvers.le.acme.email=${ACME_EMAIL:-admin@tartanak.com}
      - --certificatesresolvers.le.acme.storage=/certs/acme.json
      - --entrypoints.websecure.transport.respondingTimeouts.readTimeout=86400s
    networks:
      - tartanak-web
    logging:
      driver: "json-file"
      options: { max-size: "20m", max-file: "3" }

networks:
  tartanak-web:
    external: true

volumes:
  tartanak-traefik-certs:
TRAEFIK_COMPOSE

# Seed empty routes file if not already present
if [[ ! -f "$ROUTES_FILE" ]]; then
  cat > "$ROUTES_FILE" << 'ROUTES_SEED'
http:
  routers: {}
  services: {}
  middlewares: {}
ROUTES_SEED
fi

if ! docker ps --format '{{.Names}}' | grep -q "^tartanak-traefik$"; then
  ACME_EMAIL="$ACME_EMAIL" docker compose -f "$TRAEFIK_DIR/docker-compose.yml" up -d
  success "Traefik started"
else
  success "Traefik already running"
fi

# ── 3. Pull image ─────────────────────────────────────────────────────────────
step "3/5  Pull platform image"
info "Pulling ${IMAGE}..."
docker pull "$IMAGE" || die "Failed to pull ${IMAGE}. If private: docker login ghcr.io"
success "Image ready"

# ── 4. Create and start instance ──────────────────────────────────────────────
step "4/5  Create instance: ${SUBDOMAIN}"

[[ -d "$INSTANCE_DIR" ]] && \
  die "Instance '${SUBDOMAIN}' already exists. To remove: bash ${INSTANCE_DIR}/uninstall.sh"

mkdir -p "$INSTANCE_DIR"

cat > "$INSTANCE_DIR/docker-compose.yml" << COMPOSE
services:
  ${SUBDOMAIN}:
    image: ${IMAGE}
    container_name: ${CONTAINER}
    restart: unless-stopped
    environment:
      APP_PORT: "8080"
      DOMAIN: "${DOMAIN}"
      GATEWAY_TOKEN: "${PASSWORD}"
    volumes:
      - tartanak-${SUBDOMAIN}-gateway:/home/node/.tartanak
      - tartanak-${SUBDOMAIN}-data:/app/website/.tartanak
    networks:
      - tartanak-web
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

docker compose -f "$INSTANCE_DIR/docker-compose.yml" up -d
success "Container started"

# ── 5. Register route in Traefik ──────────────────────────────────────────────
step "5/5  Register Traefik route → ${DOMAIN}"

python3 - << PYEOF
import sys
try:
    import yaml
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "pyyaml"])
    import yaml

routes_file = '${ROUTES_FILE}'
name       = '${SUBDOMAIN}'
domain     = '${DOMAIN}'
container  = '${CONTAINER}'

try:
    with open(routes_file) as f:
        cfg = yaml.safe_load(f) or {}
except Exception:
    cfg = {}

http = cfg.setdefault('http', {})
http.setdefault('routers', {})[name] = {
    'rule':        f'Host(\`{domain}\`)',
    'entrypoints': ['websecure'],
    'tls':         {'certResolver': 'le'},
    'service':     f'{name}-svc',
    'middlewares': [f'{name}-ws'],
}
http.setdefault('services', {})[f'{name}-svc'] = {
    'loadBalancer': {'servers': [{'url': f'http://{container}:8080'}]}
}
http.setdefault('middlewares', {})[f'{name}-ws'] = {
    'headers': {'customRequestHeaders': {'X-Forwarded-Proto': 'https'}}
}

with open(routes_file, 'w') as f:
    yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True)

print(f"Route '{name}' → {domain} added to routes.yml")
PYEOF

success "Traefik route registered (auto-reload, no restart needed)"

# ── Write uninstall helper ────────────────────────────────────────────────────
cat > "$INSTANCE_DIR/uninstall.sh" << UNINSTALL
#!/usr/bin/env bash
set -euo pipefail
DIR="\$(cd "\$(dirname "\$0")" && pwd)"
NAME="\$(basename "\$DIR")"
ROUTES="${ROUTES_FILE}"

echo "Removing Tartanak instance: \$NAME"
docker compose -f "\$DIR/docker-compose.yml" down -v

python3 - << 'PYEOF'
import yaml, os
name = os.environ.get('_NAME', '${SUBDOMAIN}')
rf   = '${ROUTES_FILE}'
with open(rf) as f: cfg = yaml.safe_load(f) or {}
http = cfg.get('http', {})
for section in ('routers', 'services', 'middlewares'):
    for key in [name, f'{name}-svc', f'{name}-ws']:
        http.get(section, {}).pop(key, None)
with open(rf, 'w') as f: yaml.dump(cfg, f, default_flow_style=False)
print(f"Route '{name}' removed from routes.yml")
PYEOF

rm -rf "\$DIR"
echo "Done. Remove DNS A record for ${DOMAIN}"
UNINSTALL
chmod +x "$INSTANCE_DIR/uninstall.sh"

# ── Wait for healthy ──────────────────────────────────────────────────────────
echo ""
info "Waiting for container to become healthy (up to 3 min for first boot)..."
WAITED=0
while [[ $WAITED -lt 180 ]]; do
  if docker exec "$CONTAINER" curl -sf http://localhost:8080/ &>/dev/null; then
    break
  fi
  printf "."; sleep 5; WAITED=$((WAITED+5))
done
echo ""

# ── Done ──────────────────────────────────────────────────────────────────────
SERVER_IP=$(curl -4s --max-time 5 ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

echo ""
echo -e "${G}${B}════════════════════════════════════════════════════${NC}"
echo -e "${G}${B}  Tartanak '${SUBDOMAIN}' is live!${NC}"
echo -e "${G}${B}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐  Website:    ${B}https://${DOMAIN}/${NC}"
echo -e "  ⚙️   Dashboard:  ${B}https://${DOMAIN}/tartanak/${NC}"
echo -e "  ✏️   Editor:     ${B}https://${DOMAIN}/tartanak/edit/${NC}"
echo ""
if [[ "$GENERATED_PASSWORD" == "true" ]]; then
  echo -e "  🔑  Token (auto-generated): ${B}${PASSWORD}${NC}"
else
  echo -e "  🔑  Token: ${B}${PASSWORD}${NC}"
fi
echo ""
echo -e "  ${Y}⚠  DNS:${NC} Add an A record:  ${DOMAIN}  →  ${SERVER_IP}"
echo "     SSL certificate is issued automatically once DNS resolves."
echo ""
echo "  Manage:"
echo "    docker logs ${CONTAINER} -f"
echo "    bash ${INSTANCE_DIR}/uninstall.sh"
echo ""
