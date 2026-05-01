#!/usr/bin/env bash
# =============================================================================
#  Saturn — Autonomous Infrastructure Management Platform
#  One-Click Installer for Ubuntu Server (22.04 / 24.04 LTS)
#  Engine: Ares Neural Engine v1.0 / OBPA-v4 / ContextP Memory
#  Repository: https://github.com/uramos89/SaturnServer
# =============================================================================
set -euo pipefail

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

# ─── Root check ─────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "This script must be run as root (sudo ./install.sh)"
fi

# ─── Configurable variables ─────────────────────────────────────────────────
INSTALL_DIR="${INSTALL_DIR:-/opt/saturn}"
REPO_URL="${REPO_URL:-https://github.com/uramos89/SaturnServer.git}"
BRANCH="${BRANCH:-main}"
NODE_VERSION="${NODE_VERSION:-20}"
APP_PORT="${APP_PORT:-3000}"
PM2_APP_NAME="${PM2_APP_NAME:-saturn}"

# ─── ASCII Art: Saturn with Rings ──────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}"
echo '       ╔══════════════════════════════════════════════════════════════╗'
echo '       ║                    S A T U R N                              ║'
echo '       ║         Autonomous Infrastructure Platform                   ║'
echo '       ║     Powered by Ares Neural Engine ⚡ ContextP Memory         ║'
echo '       ╚══════════════════════════════════════════════════════════════╝'
echo -e "${NC}"
echo ""
echo -e "                 ${YELLOW}          .            ${NC}"
echo -e "                 ${YELLOW}         / \           ${NC}"
echo -e "                 ${YELLOW}     .--'-'--.         ${NC}"
echo -e "                 ${YELLOW}    /  .---.  \        ${NC}"
echo -e "                 ${YELLOW}   /  /     \  \       ${NC}"
echo -e "      ${CYAN}═══════════${YELLOW}(  (  SATURN  )  )${CYAN}═══════════${NC}"
echo -e "      ${CYAN}   ║      ${YELLOW}\  \     /  /       ${CYAN}     ║${NC}"
echo -e "      ${CYAN}   ║       ${YELLOW} '--'---'--'        ${CYAN}     ║${NC}"
echo -e "      ${CYAN}   ║        ${YELLOW}  |   |            ${CYAN}     ║${NC}"
echo -e "      ${CYAN}   ║        ${YELLOW}  |   |            ${CYAN}     ║${NC}"
echo -e "      ${CYAN}   ║       ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄         ${CYAN}     ║${NC}"
echo -e "      ${CYAN}   ║  ▄▄▄███████████████████████▄▄▄    ${CYAN}     ║${NC}"
echo -e "      ${CYAN}   ╚══██████████████████████████████═══${CYAN}     ║${NC}"
echo -e "      ${CYAN}      ████████████████████████████████${CYAN}      ║${NC}"
echo -e "      ${CYAN}         ▀▀▀███████████████████▀▀▀${CYAN}         ║${NC}"
echo -e "      ${CYAN}              ▀▀▀▀▀▀▀▀▀▀▀▀▀${CYAN}              ║${NC}"
echo -e "      ${CYAN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}${BOLD}✦  Welcome to Saturn  ✦${NC}"
echo -e "  ${BLUE}Autonomous infrastructure management with neural intelligence${NC}"
echo -e "  ${BLUE}Real-time SSH • AI diagnostics • Self-healing • Audit trail${NC}"
echo ""

# ─── 1. System update & base dependencies ──────────────────────────────────
info "Step 1/7: Updating system and installing base dependencies..."
apt update && apt upgrade -y
apt install -y git build-essential curl sqlite3
log "System updated and base dependencies installed."

# ─── 2. Install Node.js LTS ────────────────────────────────────────────────
info "Step 2/7: Installing Node.js ${NODE_VERSION} LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt install -y nodejs
  log "Node.js $(node -v) installed."
else
  log "Node.js $(node -v) already installed."
fi

# ─── 3. Clone / update repository ──────────────────────────────────────────
info "Step 3/7: Cloning repository..."
if [[ -d "$INSTALL_DIR/.git" ]]; then
  warn "Directory $INSTALL_DIR already exists. Updating..."
  cd "$INSTALL_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
  log "Repository updated."
else
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  log "Repository cloned to $INSTALL_DIR."
fi

cd "$INSTALL_DIR"

# ─── 4. Install npm dependencies ───────────────────────────────────────────
info "Step 4/7: Installing npm dependencies..."
npm install --production=false
log "Dependencies installed."

# ─── 5. Configure environment variables ────────────────────────────────────
info "Step 5/7: Configuring environment variables..."

# Prompt for GEMINI_API_KEY if missing or placeholder
if [[ ! -f .env ]] || ! grep -q "GEMINI_API_KEY=" .env || grep -q 'GEMINI_API_KEY=""' .env || grep -q "GEMINI_API_KEY=\"MY_GEMINI_API_KEY\"" .env; then
  echo -e "${YELLOW}Enter your GEMINI_API_KEY (get one at https://aistudio.google.com):${NC}"
  read -rp "> " GEMINI_KEY
  if [[ -z "$GEMINI_KEY" ]]; then
    err "GEMINI_API_KEY is required. Run the script again."
  fi
  cat > .env <<EOF
GEMINI_API_KEY="${GEMINI_KEY}"
NODE_ENV=production
APP_URL="http://localhost:${APP_PORT}"
EOF
  log ".env file created at $INSTALL_DIR/.env"
else
  log ".env file already exists and contains an API Key."
fi

# ─── 6. Build frontend ─────────────────────────────────────────────────────
info "Step 6/7: Building frontend for production..."
npm run build
log "Frontend compiled at $INSTALL_DIR/dist/"

# ─── 7. Configure PM2 daemon ───────────────────────────────────────────────
info "Step 7/7: Configuring PM2 daemon..."

if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  log "PM2 installed globally."
fi

# Install tsx globally for TypeScript execution
if ! command -v tsx &>/dev/null; then
  npm install -g tsx
  log "tsx interpreter installed globally."
fi

# Stop previous instance if exists
pm2 delete "$PM2_APP_NAME" 2>/dev/null || true

# Start with tsx interpreter (TypeScript in production)
pm2 start server.ts --interpreter tsx --name "$PM2_APP_NAME" \
  --cwd "$INSTALL_DIR" \
  --env NODE_ENV=production \
  --log "$INSTALL_DIR/logs/pm2.log" \
  --merge-logs

# Save configuration for auto-restart
pm2 save

# Configure startup (creates systemd unit)
pm2 startup systemd -u root --hp /root 2>/dev/null || true
pm2 startup 2>/dev/null || true

log "PM2 configured: $PM2_APP_NAME running."

# ─── Configure Firewall (UFW) ──────────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset 2>/dev/null || true
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow "$APP_PORT/tcp" comment "Saturn Web UI"
ufw --force enable
log "UFW configured: port $APP_PORT open."

# ─── Create ContextP structure (if not exists) ─────────────────────────────
if [[ ! -d "$INSTALL_DIR/ContextP" ]]; then
  mkdir -p "$INSTALL_DIR/ContextP"/{_INDEX,CONTRACTS,TECH,FUNC,STRUCT,AUDIT/{success,failure},PARAMS}
  log "ContextP structure created at $INSTALL_DIR/ContextP/"
fi

# ─── Verification ──────────────────────────────────────────────────────────
info "Verifying installation..."
sleep 3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/api/health" 2>/dev/null || echo "000")

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              INSTALLATION COMPLETE ✓                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Directory:    $INSTALL_DIR"
echo "║  Port:         $APP_PORT"
echo "║  Service:      pm2 status $PM2_APP_NAME"
echo "║  Logs:         pm2 logs $PM2_APP_NAME"
echo "║  Restart:      pm2 restart $PM2_APP_NAME"
echo "║                                                             ║"
if [[ "$HEALTH" == "200" ]]; then
  echo "║  Status:       ${GREEN}RUNNING${NC} (HTTP $HEALTH)              ║"
else
  echo "║  Status:       ${YELLOW}CHECK${NC} (HTTP $HEALTH)                 ║"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── Quick Reference ───────────────────────────────────────────────────────
cat <<EOF
╔═══════════════════════════════════════════════════════════════╗
║                 Useful Commands                              ║
╠═══════════════════════════════════════════════════════════════╣
║  View status:  sudo pm2 status                               ║
║  View logs:    sudo pm2 logs ${PM2_APP_NAME}                    ║
║  Restart:      sudo pm2 restart ${PM2_APP_NAME}                ║
║  Stop:         sudo pm2 stop ${PM2_APP_NAME}                   ║
║  Health check: curl http://localhost:${APP_PORT}/api/health    ║
║  Database:     sqlite3 ${INSTALL_DIR}/saturn.db ".tables"      ║
╚═══════════════════════════════════════════════════════════════╝

Open http://localhost:${APP_PORT} in your browser to access the dashboard.

Thank you for deploying Saturn! 🪐
EOF
