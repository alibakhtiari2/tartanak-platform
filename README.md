# Tartanak Platform

Complete Docker image: Next.js website + AI agent dashboard + visual CMS editor.

## URL structure per instance

| Path | What |
|------|------|
| `name.tartanak.com/` | Public website |
| `name.tartanak.com/tartanak/` | AI agent dashboard |
| `name.tartanak.com/tartanak/edit/` | Visual CMS editor |
| `name.tartanak.com/hub` | Customer subscription portal |
| `name.tartanak.com/support` | Support portal |

---

## Step 1 — Build and push the image

### Prerequisites
- Docker installed
- GitHub account with a repo (can be private)
- `tartanak:latest` image available locally: `docker images | grep tartanak`

### Build

```bash
cd finalv1
docker build -t tartanak-platform:latest .
```

### Push to ghcr.io (private)

**1. Create a GitHub Personal Access Token (PAT)**

Go to: https://github.com/settings/tokens → "Generate new token (classic)"

Required scopes:
- `write:packages`
- `read:packages`
- `delete:packages` (optional)

**2. Login to ghcr.io**

```bash
echo "YOUR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

**3. Tag and push**

```bash
docker tag tartanak-platform:latest ghcr.io/YOUR_GITHUB_USERNAME/tartanak-platform:latest
docker push ghcr.io/YOUR_GITHUB_USERNAME/tartanak-platform:latest
```

**4. Make the package private**

Go to: https://github.com/YOUR_GITHUB_USERNAME?tab=packages
→ Click `tartanak-platform` → Package Settings → Change visibility → Private

**5. Update install.sh**

Edit `finalv1/install.sh` line 15:
```bash
readonly IMAGE="ghcr.io/YOUR_GITHUB_USERNAME/tartanak-platform:latest"
```

---

## Step 2 — Deploy a new instance (one-liner)

### First: make install.sh available

Commit `finalv1/install.sh` to your GitHub repo, then on each server run:

```bash
# Method A: pipe from GitHub
curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/finalv1/install.sh \
  | sudo bash -s -- myshop

# Method B: if you have the file locally
sudo bash install.sh myshop [optional-token] [ssl-email@example.com]
```

This single command:
1. Pulls the image from ghcr.io
2. Finds a free port
3. Creates `/opt/tartanak/instances/myshop/`
4. Starts the container
5. Configures nginx
6. Issues an SSL certificate via Let's Encrypt

### Server requirements

```bash
# Ubuntu/Debian
apt install -y docker.io nginx certbot python3-certbot-nginx
systemctl enable --now docker nginx
```

### DNS

Point `*.tartanak.com` (or individual `myshop.tartanak.com`) to your server IP.

---

## Step 3 — Managing instances

```bash
# List running instances
docker ps --filter name=tartanak- --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Logs for an instance
docker logs tartanak-myshop -f

# Restart an instance
docker compose -f /opt/tartanak/instances/myshop/docker-compose.yml restart

# Update all instances to new image version
for dir in /opt/tartanak/instances/*/; do
  docker compose -f "$dir/docker-compose.yml" pull
  docker compose -f "$dir/docker-compose.yml" up -d
done

# Remove an instance
bash /opt/tartanak/instances/myshop/uninstall.sh
```

---

## Step 4 — Post-deploy configuration

Edit `/opt/tartanak/instances/myshop/.env` and fill in:

```bash
# Email notifications
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Customer portal auth (openssl rand -hex 32)
HUB_SECRET=...

# Billing/accounting server
ACCOUNTING_API_URL=https://billing.tartanak.com/api
ACCOUNTING_API_KEY=sk_live_...

# Password-protect the visual editor (optional)
EDITOR_PASSWORD=...
```

Then restart:
```bash
docker compose -f /opt/tartanak/instances/myshop/docker-compose.yml up -d
```

---

## Local backup (single file)

```bash
# Create full backup
tar -czf tartanak-platform-backup-$(date +%Y%m%d).tar.gz \
  --exclude='*/node_modules' \
  --exclude='*/.next' \
  finalv1/

# Also backup all instance configs (not volumes — those need docker save for volumes)
tar -czf tartanak-instances-$(date +%Y%m%d).tar.gz \
  /opt/tartanak/instances/

# Backup Docker image itself
docker save tartanak-platform:latest | gzip > tartanak-platform-image-$(date +%Y%m%d).tar.gz
```

---

## SSL renewal

Certbot auto-renews SSL certs. Verify the timer is active:

```bash
systemctl status certbot.timer
# or manually renew all:
certbot renew --nginx
```

---

## Architecture inside the container

```
Browser → nginx → container:PORT (mapped 127.0.0.1 only)
                       ↓
               Unified proxy :8080
                  ├── /tartanak/edit/* → Next.js :3000 (+ editor injection)
                  ├── /tartanak/*      → Tartanak gateway :18789 (AI dashboard)
                  ├── /__tartanak/*    → Editor API (tokens, services, password)
                  └── /*              → Next.js :3000 (public website)
```

Each instance has its own:
- Docker container (isolated)
- Nginx vhost (in `/etc/nginx/conf.d/`)
- SSL cert (via certbot)
- Data volumes (gateway state + editor placements)
