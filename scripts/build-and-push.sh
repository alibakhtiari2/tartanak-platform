#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Build the platform image and push to ghcr.io
#
#  Usage:
#    GITHUB_USER=yourusername GITHUB_TOKEN=ghp_xxx bash scripts/build-and-push.sh
#
#  Or with a specific tag:
#    TAG=v2026.5 bash scripts/build-and-push.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

GITHUB_USER="${GITHUB_USER:?Set GITHUB_USER=your-github-username}"
GITHUB_TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN=ghp_yourtoken}"
REPO="${REPO:-tartanak-platform}"
TAG="${TAG:-latest}"
IMAGE="ghcr.io/${GITHUB_USER}/${REPO}:${TAG}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building: $IMAGE"
echo "Context: $SCRIPT_DIR"

# ── Login ─────────────────────────────────────────────────────────────────────
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
echo "✓ Logged in to ghcr.io"

# ── Build ─────────────────────────────────────────────────────────────────────
docker build \
  --platform linux/amd64 \
  --label "org.opencontainers.image.source=https://github.com/${GITHUB_USER}/${REPO}" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "org.opencontainers.image.revision=$(git rev-parse HEAD 2>/dev/null || echo unknown)" \
  -t "$IMAGE" \
  -t "ghcr.io/${GITHUB_USER}/${REPO}:$(date +%Y%m%d)" \
  "$SCRIPT_DIR"

echo "✓ Build complete: $IMAGE"

# ── Push ──────────────────────────────────────────────────────────────────────
docker push "$IMAGE"
docker push "ghcr.io/${GITHUB_USER}/${REPO}:$(date +%Y%m%d)"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Pushed: $IMAGE"
echo "═══════════════════════════════════════════════════"
echo ""
echo " To make the package private:"
echo "   1. https://github.com/${GITHUB_USER}?tab=packages"
echo "   2. Click '${REPO}' → Package Settings → Change visibility → Private"
echo ""
echo " To allow servers to pull it:"
echo "   docker login ghcr.io -u ${GITHUB_USER} --password-stdin <<< YOUR_PAT"
echo ""
echo " Next: update install.sh line 15:"
echo "   readonly IMAGE=\"${IMAGE}\""
