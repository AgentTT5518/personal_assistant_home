#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/personal-assistant}"

echo "=== Personal Assistant Home — Deploy ==="
echo "Install directory: $INSTALL_DIR"
echo ""

# 1. Install production dependencies and build
echo "[1/3] Installing dependencies and building..."
npm ci --omit=dev
npm run build

# 2. Run database migrations
echo "[2/3] Running database migrations..."
npx tsx src/server/lib/db/migrate.ts

# 3. Check for .env file
echo "[3/3] Checking configuration..."
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
  echo ""
  echo "WARNING: No .env or .env.local file found."
  echo "  Copy .env.example and fill in your values:"
  echo "  cp .env.example .env"
  echo ""
fi

echo ""
echo "=== Build complete ==="
echo ""
echo "To set up as a systemd service:"
echo ""
echo "  # Create service user (if needed)"
echo "  sudo useradd -r -s /bin/false personal-assistant"
echo ""
echo "  # Copy files to install directory"
echo "  sudo mkdir -p $INSTALL_DIR"
echo "  sudo cp -r dist/ node_modules/ package.json src/server/lib/db/migrations/ $INSTALL_DIR/"
echo "  sudo cp .env $INSTALL_DIR/.env"
echo "  sudo chown -R personal-assistant:personal-assistant $INSTALL_DIR"
echo ""
echo "  # Install and start service"
echo "  sudo cp deploy/personal-assistant.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable personal-assistant"
echo "  sudo systemctl start personal-assistant"
echo ""
echo "  # Check status"
echo "  sudo systemctl status personal-assistant"
echo "  sudo journalctl -u personal-assistant -f"
