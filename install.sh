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
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

REPO_URL="https://github.com/uramos89/SaturnServer.git"
APP_DIR="$HOME/saturn"
ENV_FILE="$APP_DIR/.env"

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
echo -e "│  Saturn is an autonomous infrastructure platform.                           │"
echo -e "│  It uses AI to generate and execute administrative scripts via SSH.        │"
echo -e "│  By default, it uses port 3000 and requires a secure environment.          │"
echo -e "│                                                                            │"
echo -e "│  ${BOLD}Core Principles:${NC}                                                          │"
echo -e "│  - Automated telemetry via SSH Agent.                                      │"
echo -e "│  - Encrypted identity vault for credentials.                              │"
echo -e "│  - Compliance-ready audit logging.                                         │"
echo -e "│  - Local AI engine (no cloud dependency)                                   │"
echo -e "│                                                                            │"
echo -e "│  Visit: https://github.com/uramos89/SaturnServer for documentation.        │"
echo -e "│                                                                            │"
echo -e "├────────────────────────────────────────────────────────────────────────────╯"
echo -e "│"

# ═══════════════════════════════════════════════════════════════════════
# STEP 1: System Dependencies
# ═══════════════════════════════════════════════════════════════════════
echo -e "├─ ${BOLD}[1/5] Checking dependencies...${NC}"
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

# ═══════════════════════════════════════════════════════════════════════
# STEP 2: Clone/Update Repository
# ═══════════════════════════════════════════════════════════════════════
echo -e "├─ ${BOLD}[2/5] Fetching latest code...${NC}"
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

# ═══════════════════════════════════════════════════════════════════════
# STEP 3: npm install + Build
# ═══════════════════════════════════════════════════════════════════════
echo -e "├─ ${BOLD}[3/5] Installing dependencies & building...${NC}"
echo -e "│  Running npm install (may take a minute)..."
npm install --silent >/dev/null 2>&1
echo -e "│  Building frontend..."
npm run build >/dev/null 2>&1
echo -e "│  ${GREEN}Build completed${NC}"
echo -e "│"

# ═══════════════════════════════════════════════════════════════════════
# STEP 4: Local AI Engine — Ollama + Model Selection
# ═══════════════════════════════════════════════════════════════════════
echo -e "├─ ${BOLD}[4/5] Installing Local AI Engine...${NC}"

# ── Detect resources ─────────────────────────────────────────────────
total_ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
total_ram_mb=$((total_ram_kb / 1024))
cpu_cores=$(nproc)
ram_gb=$(echo "scale=1; $total_ram_mb/1024" | bc)

echo -e "│  🔍 Detected: ${ram_gb}GB RAM  |  ${cpu_cores} CPU cores"

# ── Install Ollama if needed ─────────────────────────────────────────
if command -v ollama &> /dev/null; then
  echo -e "│  ✅ Ollama already installed"
else
  echo -e "│  Installing Ollama (local AI runtime)..."
  curl -fsSL https://ollama.com/install.sh | sh 2>&1 | tail -1
fi

# ── Auto-selection logic ─────────────────────────────────────────────
select_model_auto() {
  local ram=$1
  local cores=$2
  # Prioritizes stability. Qwen2.5-Coder is the default.
  if [ "$ram" -lt 6000 ]; then
    echo "qwen2.5-coder:1.5b"
  elif [ "$ram" -lt 8000 ]; then
    echo "gemma3:4b"
  elif [ "$ram" -lt 10000 ]; then
    echo "qwen2.5-coder:7b"
  elif [ "$ram" -lt 12000 ]; then
    echo "qwen2.5-coder:7b"   # 7B is safe; 12B may be tight
  elif [ "$ram" -lt 16000 ]; then
    echo "qwen2.5:14b"
  else
    echo "qwen2.5:14b"
  fi
}

# ── Manual selection: show tiered options based on resources ─────────
show_manual_menu() {
  local ram=$1
  echo ""
  echo -e "  ${BOLD}Available models for ${ram_gb}GB RAM:${NC}"
  echo ""
  local i=1
  # Always show 1.5B
  echo -e "  ${i}) Qwen2.5-Coder 1.5B  ${DIM}(~1GB, fastest, basic ARES)${NC}"; options[$i]="qwen2.5-coder:1.5b"; ((i++))
  if [ "$ram" -ge 4000 ]; then
    echo -e "  ${i}) Gemma 3 4B  ${DIM}(~3GB, multimodal, Apache 2.0)${NC}"; options[$i]="gemma3:4b"; ((i++))
  fi
  if [ "$ram" -ge 6000 ]; then
    echo -e "  ${i}) Qwen2.5-Coder 3B  ${DIM}(~2.5GB, balance velocidad/calidad)${NC}"; options[$i]="qwen2.5-coder:3b"; ((i++))
  fi
  if [ "$ram" -ge 8000 ]; then
    echo -e "  ${i}) Qwen2.5-Coder 7B  ${DIM}(~4.5GB, recomendada para 8-12GB)${NC}"; options[$i]="qwen2.5-coder:7b"; ((i++))
  fi
  if [ "$ram" -ge 10000 ]; then
    echo -e "  ${i}) Gemma 3 12B  ${DIM}(~10GB, multimodal 128K, Apache 2.0)${NC}"; options[$i]="gemma3:12b"; ((i++))
  fi
  if [ "$ram" -ge 14000 ]; then
    echo -e "  ${i}) Qwen2.5 14B  ${DIM}(~10GB, best quality for complex tasks)${NC}"; options[$i]="qwen2.5:14b"; ((i++))
  fi
  local max_idx=$((i - 1))
  echo ""
  read -p "  Select model [1-$max_idx]: " choice
  # Validate
  if [[ ! "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "$max_idx" ]; then
    echo -e "  ${RED}Invalid selection, using auto-recommended${NC}"
    select_model_auto "$ram"
  else
    echo "${options[$choice]}"
  fi
}

# ── Model selection menu ─────────────────────────────────────────────
echo ""
echo -e "│  ${BOLD}🤖 ARES Local AI Engine${NC}"
echo -e "│  ${DIM}Select how to choose your local model:${NC}"
echo ""
echo -e "│  ${BOLD}1) Auto ✨ (Recommended)${NC}"
echo -e "│     Detects hardware and selects optimal model"
echo ""
echo -e "│  ${BOLD}2) Manual${NC}"
echo -e "│     Choose from models compatible with your hardware"
echo ""
echo -e "│  ${BOLD}3) Expert${NC}"
echo -e "│     Enter any Ollama model name (warning if under-resourced)"
echo ""
read -p "│  Option [1-3]: " -n 1 -r option
echo ""

case "$option" in
  2)
    echo -e "│  ${YELLOW}Manual selection${NC}"
    SELECTED_MODEL=$(show_manual_menu "$total_ram_mb")
    ;;
  3)
    echo ""
    read -p "│  Enter model name (e.g., qwen2.5-coder:7b, gemma3:12b, llama3.2:3b): " EXPERT_MODEL
    SELECTED_MODEL="$EXPERT_MODEL"
    # Warning if resources might be insufficient
    local ram_needed=$(echo "$SELECTED_MODEL" | grep -oP '\d+(?=b)' | head -1)
    ram_needed=${ram_needed:-7}
    if [ "$total_ram_mb" -lt $((ram_needed * 1000)) ]; then
      echo -e "│  ${YELLOW}⚠️  Warning: ${MODEL} may need ~${ram_needed}GB RAM. You have ${ram_gb}GB.${NC}"
      read -p "│  Continue? [Y/n]: " confirm
      if [[ "$confirm" =~ ^[Nn] ]]; then
        SELECTED_MODEL=$(select_model_auto "$total_ram_mb")
        echo -e "│  Using auto-selected: ${SELECTED_MODEL}"
      fi
    fi
    ;;
  *)
    SELECTED_MODEL=$(select_model_auto "$total_ram_mb")
    echo -e "│  ✨ Auto-selected: ${SELECTED_MODEL}"
    ;;
esac

echo ""
echo -e "│  📥 Pulling ${SELECTED_MODEL} (this may take several minutes)..."
ollama pull "$SELECTED_MODEL" 2>&1 | tail -1
echo -e "│  ${GREEN}✅ Local AI Engine ready: ${SELECTED_MODEL}${NC}"
echo -e "│"

# ── Write local model config to .env ─────────────────────────────────
if [ -f "$ENV_FILE" ] || [ -f "$APP_DIR/.env.example" ]; then
  TARGET_ENV="$ENV_FILE"
  # Ensure ARES_LLM vars are set
  if grep -q "^ARES_LLM_PROVIDER=" "$TARGET_ENV" 2>/dev/null; then
    sed -i "s|^ARES_LLM_PROVIDER=.*|ARES_LLM_PROVIDER=ollama_local|" "$TARGET_ENV"
  else
    echo "ARES_LLM_PROVIDER=ollama_local" >> "$TARGET_ENV"
  fi
  if grep -q "^OLLAMA_MODEL=" "$TARGET_ENV" 2>/dev/null; then
    sed -i "s|^OLLAMA_MODEL=.*|OLLAMA_MODEL=${SELECTED_MODEL}|" "$TARGET_ENV"
  else
    echo "OLLAMA_MODEL=${SELECTED_MODEL}" >> "$TARGET_ENV"
  fi
  if grep -q "^OLLAMA_BASE_URL=" "$TARGET_ENV" 2>/dev/null; then
    sed -i "s|^OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=http://localhost:11434|" "$TARGET_ENV"
  else
    echo "OLLAMA_BASE_URL=http://localhost:11434" >> "$TARGET_ENV"
  fi
  echo -e "│  ${GREEN}✅ Config saved to .env${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 5: Interactive Setup Wizard
# ═══════════════════════════════════════════════════════════════════════
echo -e "├─ ${BOLD}[5/5] Launching Setup Wizard...${NC}"
echo -e "│  Configure cloud API keys, notifications, and admin user."
npm run setup

echo -e "│"
echo -e "└─ ${BOLD}${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "  ${BOLD}🪐 SATURN SERVER${NC}"
echo -e "  ───────────────────────────"
echo -e "  ${GREEN}✅ Local AI: ${SELECTED_MODEL}${NC}"
echo -e "  ${GREEN}✅ RAM: ${ram_gb}GB  |  CPU: ${cpu_cores} cores${NC}"
echo -e "  🌐 Open: http://localhost:3000 to configure cloud API"
echo -e "  📖 Docs: https://github.com/uramos89/SaturnServer"
echo ""
echo -e "=============================================================================="
