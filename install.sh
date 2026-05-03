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
echo -e "├─ ${BOLD}[3/5] Installing dependencies & building...${NC}"
echo -e "│  Running npm install (this may take a minute)..."
npm install --silent >/dev/null 2>&1
echo -e "│  Building frontend assets..."
npm run build >/dev/null 2>&1
echo -e "│  ${GREEN}Build completed${NC}"
echo -e "│"

# 4. Local AI Engine (Ollama + Qwen)
echo -e "├─ ${BOLD}[4/5] Installing Local AI Engine...${NC}"

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
  echo -e "│  ✅ Ollama already installed"
else
  echo -e "│  Installing Ollama (local AI runtime)..."
  curl -fsSL https://ollama.com/install.sh | sh 2>&1 | tail -1
fi

# Detect available RAM and select appropriate Qwen model
echo -e "│  📡 Detecting hardware for model selection..."
RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
RAM_GB=$(echo "scale=1; $RAM_MB/1024" | bc)
echo -e "│  System RAM: ${RAM_GB}GB"

if (( $(echo "$RAM_MB >= 12000" | bc -l) )); then
  MODEL="qwen2.5:14b"
elif (( $(echo "$RAM_MB >= 8000" | bc -l) )); then
  MODEL="qwen2.5-coder:7b"
elif (( $(echo "$RAM_MB >= 6000" | bc -l) )); then
  MODEL="qwen2.5-coder:3b"
else
  MODEL="qwen2.5-coder:1.5b"
fi

echo -e "│  📥 Pulling ${MODEL} (this may take a few minutes)..."
ollama pull "$MODEL" 2>&1 | tail -1
echo -e "│  ✅ Local AI Engine ready: ${MODEL}"
echo -e "│"

# 5. Interactive Setup & Start
echo -e "├─ ${BOLD}[5/5] Launching Interactive Setup Wizard...${NC}"
npm run setup

# The setup script handles .env, systemd generation, and AI provider config.
echo -e "│"
echo -e "└─ ${BOLD}${GREEN}Deployment Script Finished!${NC}"
echo ""
echo -e "  ${BOLD}🪐 SATURN SERVER${NC}"
echo -e "  ───────────────────────────"
echo -e "  ${GREEN}✅ Local AI: ${MODEL}${NC}"
echo -e "  🌐 Open: http://localhost:3000 to configure cloud API"
echo -e "  📖 Docs: https://github.com/uramos89/SaturnServer"
echo ""
echo -e "=============================================================================="

