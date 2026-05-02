#!/bin/bash
# Saturn-X Quick Installer
# Purpose: Fast deployment from GitHub for Linux servers
# Usage: curl -s https://raw.githubusercontent.com/uramos89/SaturnServer/main/install.sh | bash

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

REPO_URL="https://github.com/uramos89/SaturnServer.git"
APP_DIR="$HOME/saturn"

clear

echo -e "${CYAN}"
echo "   ██████╗ █████╗ ████████╗██╗   ██╗██████╗ ███╗   ██╗"
echo "  ██╔════╝██╔══██╗╚══██╔══╝██║   ██║██╔══██╗████╗  ██║"
echo "  ╚█████╗ ███████║   ██║   ██║   ██║██████╔╝██╔██╗ ██║"
echo "   ╚═══██╗██╔══██║   ██║   ██║   ██║██╔══██╗██║╚██╗██║"
echo "  ██████╔╝██║  ██║   ██║   ╚██████╔╝██║  ██║██║ ╚████║"
echo "  ╚═════╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝"
echo -e "                    ${BOLD}🪐 SATURN SERVER 🪐${NC}"

echo ""
echo -e "${BOLD}┌  Saturn setup${NC}"
echo -e "│"
echo -e "◇  ${YELLOW}Security disclaimer${NC} ─────────────────────────────────────────────────────────────╮"
echo -e "│                                                                            │"
echo -e "│  Saturn is an autonomous infrastructure platform and still in beta.        │"
echo -e "│  This system uses AI to generate and execute administrative scripts.       │"
echo -e "│  By default, it uses port 3000 and requires a secure environment.          │"
echo -e "│                                                                            │"
echo -e "│  ${BOLD}Core Principles:${NC}                                                          │"
echo -e "│  - Automated telemetry via SSH Agent.                                      │"
echo -e "│  - Encrypted identity vault for credentials.                              │"
echo -e "│  - Compliance-ready audit logging.                                         │"
echo -e "│                                                                            │"
echo -e "│  Visit: https://github.com/uramos89/SaturnServer for documentation.        │"
echo -e "│                                                                            │"
echo -e "├────────────────────────────────────────────────────────────────────────────╯"
echo -e "│"

# 1. System Check
echo -e "├─ ${BOLD}[1/4] Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "│  Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1
  sudo apt-get install -y nodejs >/dev/null 2>&1
fi

if ! command -v git &> /dev/null; then
  echo -e "│  Installing git..."
  sudo apt-get install -y git >/dev/null 2>&1
fi

if ! command -v pm2 &> /dev/null; then
  echo -e "│  Installing PM2 globally..."
  sudo npm install -g pm2 >/dev/null 2>&1
fi

if ! command -v tsx &> /dev/null; then
  echo -e "│  Installing tsx globally..."
  sudo npm install -g tsx >/dev/null 2>&1
fi
echo -e "│  ${GREEN}Dependencies OK${NC}"
echo -e "│"

# 2. Clone/Update
echo -e "├─ ${BOLD}[2/4] Fetching latest code...${NC}"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  echo -e "│  Updating existing repository..."
  git fetch origin >/dev/null 2>&1
  git reset --hard origin/main >/dev/null 2>&1
else
  rm -rf "$APP_DIR"
  echo -e "│  Cloning from GitHub..."
  git clone "$REPO_URL" "$APP_DIR" >/dev/null 2>&1
  cd "$APP_DIR"
fi
echo -e "│  ${GREEN}Code update successful${NC}"
echo -e "│"

# 3. Build
echo -e "├─ ${BOLD}[3/4] Installing dependencies & building...${NC}"
echo -e "│  Running npm install (this may take a minute)..."
npm install --silent >/dev/null 2>&1
echo -e "│  Building frontend assets..."
npm run build >/dev/null 2>&1
echo -e "│  ${GREEN}Build completed${NC}"
echo -e "│"

# 4. Environment & Start
echo -e "├─ ${BOLD}[4/4] Finalizing configuration...${NC}"
if [ ! -f ".env" ]; then
  echo -e "│  Generating new .env file..."
  cat > .env <<EOF
PORT=3000
NODE_ENV=production
EOF
else
  echo -e "│  Validating existing .env file..."
  # Ensure PORT is set to 3000 to avoid permission issues with port 80
  if ! grep -q "^PORT=" .env; then
    echo "PORT=3000" >> .env
    echo -e "│  ${YELLOW}Added PORT=3000 to .env${NC}"
  fi
fi

# Ensure mandatory keys exist
for key in "SSH_ENCRYPTION_PEPPER" "JWT_SECRET" "SATURN_MASTER_KEY"; do
  if ! grep -q "^$key=" .env; then
    VAL=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "$key=$VAL" >> .env
    echo -e "│  ${YELLOW}Generated $key${NC}"
  fi
done


echo -e "│  Restarting PM2 process..."
pm2 stop saturn 2>/dev/null || true
pm2 delete saturn 2>/dev/null || true
NODE_ENV=production pm2 start tsx --name saturn -- server.ts >/dev/null 2>&1
pm2 save >/dev/null 2>&1

echo -e "│"
echo -e "└─ ${BOLD}${GREEN}Installation Complete!${NC}"
echo ""
echo -e "  ${BOLD}🚀 SATURN SERVER IS RUNNING${NC}"
echo -e "  ───────────────────────────"
echo -e "  ${CYAN}URL:${NC} http://$(hostname -I | awk '{print $1}'):${BOLD}3000${NC}"
echo -e "  ${CYAN}DIR:${NC} $APP_DIR"
echo -e "  ${CYAN}LOG:${NC} pm2 logs saturn"
echo ""
echo -e "=============================================================================="
