#!/bin/bash
# ─────────────────────────────────────────────────────────────
# CatalystScan VM Setup Script
# Run this ONCE on your GCP VM (tekki-x) to prepare it for
# auto-deployments via GitHub Actions.
#
# Usage:
#   chmod +x vm_setup.sh
#   sudo bash vm_setup.sh
# ─────────────────────────────────────────────────────────────
set -e

REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"  # ← Change this
DEPLOY_DIR="/opt/catalystscan"

echo "================================================"
echo "  CatalystScan VM Bootstrap"
echo "================================================"

# ── 1. Install Docker ──
echo ""
echo "[1/5] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  # Add current user to docker group so sudo isn't needed
  usermod -aG docker "$SUDO_USER"
  echo "✅ Docker installed."
else
  echo "✅ Docker already installed."
fi

# ── 2. Install Docker Compose plugin ──
echo ""
echo "[2/5] Installing Docker Compose..."
if ! docker compose version &>/dev/null; then
  apt-get install -y docker-compose-plugin
  echo "✅ Docker Compose installed."
else
  echo "✅ Docker Compose already installed."
fi

# ── 3. Install git ──
echo ""
echo "[3/5] Ensuring git is installed..."
apt-get install -y git
echo "✅ git ready."

# ── 4. Clone the repo ──
echo ""
echo "[4/5] Setting up deploy directory..."
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  git clone "$REPO_URL" "$DEPLOY_DIR"
  echo "✅ Repository cloned to $DEPLOY_DIR"
else
  echo "✅ Repository already exists at $DEPLOY_DIR"
fi

# Fix ownership so the SSH user can pull
chown -R "$SUDO_USER":"$SUDO_USER" "$DEPLOY_DIR"

# ── 5. Create .env ──
echo ""
echo "[5/5] Environment setup..."
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
  echo ""
  echo "⚠️  IMPORTANT: Edit $DEPLOY_DIR/.env with your real secrets before starting:"
  echo "    nano $DEPLOY_DIR/.env"
  echo ""
else
  echo "✅ .env already exists."
fi

echo ""
echo "================================================"
echo "  VM Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env:       nano $DEPLOY_DIR/.env"
echo "  2. First deploy:    cd $DEPLOY_DIR && docker compose up -d --build"
echo "  3. Check logs:      docker compose logs -f app"
echo "  4. Add GitHub Secrets (see README-DEPLOY.md)"
echo ""
echo "After first deploy, GitHub Actions will handle all future updates automatically."
