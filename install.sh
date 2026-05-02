#!/bin/bash
# Saturn-X Quick Installer
# Purpose: Fast deployment from GitHub for Linux servers
# Usage: curl -s https://raw.githubusercontent.com/uramos89/SaturnServer/main/install.sh | bash

set -e

REPO_URL="https://github.com/uramos89/SaturnServer.git"
APP_DIR="$HOME/saturn"

echo "========================================="
echo "  SATURN-X INSTALLER v1.1"
echo "========================================="

# 1. System Check
echo "[1/4] Checking dependencies..."
if ! command -v node &> /dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v git &> /dev/null; then
  echo "Installing git..."
  sudo apt-get install -y git
fi

if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2 globally..."
  sudo npm install -g pm2
fi

# Ensure tsx is available for pm2
if ! command -v tsx &> /dev/null; then
  echo "Installing tsx globally..."
  sudo npm install -g tsx
fi

# 2. Clone/Update
echo "[2/4] Fetching latest code..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
else
  rm -rf "$APP_DIR" # Clean up if it's not a git repo
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# 3. Build
echo "[3/4] Installing dependencies & building..."
npm install
npm run build

# 4. Environment & Start
echo "[4/4] Finalizing configuration..."
if [ ! -f ".env" ]; then
  echo "Creating .env from example..."
  cp .env.example .env 2>/dev/null || cat > .env <<EOF
PORT=3000
NODE_ENV=production
EOF
  
  # Generate keys if they don't exist
  if ! grep -q "SSH_ENCRYPTION_PEPPER" .env; then
    PEPPER=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "SSH_ENCRYPTION_PEPPER=$PEPPER" >> .env
  fi
  if ! grep -q "JWT_SECRET" .env; then
    JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "JWT_SECRET=$JWT" >> .env
  fi
  if ! grep -q "SATURN_MASTER_KEY" .env; then
    KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "SATURN_MASTER_KEY=$KEY" >> .env
  fi
fi

echo "Starting service..."
pm2 stop saturn 2>/dev/null || true
pm2 delete saturn 2>/dev/null || true
# Use absolute path for tsx if needed, but since we installed it globally it should be fine
NODE_ENV=production pm2 start tsx --name saturn -- server.ts
pm2 save

echo "========================================="
echo "  INSTALLATION COMPLETE!"
echo "  URL: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Check logs with: pm2 logs saturn"
echo "========================================="
