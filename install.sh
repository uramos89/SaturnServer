#!/usr/bin/env bash
# =============================================================================
#  Saturno - Script de Instalación para Ubuntu Server (22.04 / 24.04 LTS)
#  Basado en el protocolo DEEP‑VERIFY_ARCH / OBPA / ContextP
#  Repositorio: https://github.com/uramos89/SaturnServer
# =============================================================================
set -euo pipefail

# ─── Colores ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

# ─── Validación de ejecución como root ───────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "Este script debe ejecutarse como root (sudo ./install.sh)"
fi

# ─── Variables configurables ────────────────────────────────────────────────
INSTALL_DIR="${INSTALL_DIR:-/opt/saturno}"
REPO_URL="${REPO_URL:-https://github.com/uramos89/SaturnServer.git}"
BRANCH="${BRANCH:-main}"
NODE_VERSION="${NODE_VERSION:-20}"
APP_PORT="${APP_PORT:-3000}"
PM2_APP_NAME="${PM2_APP_NAME:-saturno}"

# ─── Banner ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   Saturno - Instalador                      ║"
echo "║       Plataforma de gestión autónoma de infraestructura      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── 1. Actualizar sistema e instalar dependencias base ─────────────────────
info "Paso 1/7: Actualizando sistema e instalando dependencias..."
apt update && apt upgrade -y
apt install -y git build-essential curl sqlite3
log "Sistema actualizado y dependencias base instaladas."

# ─── 2. Instalar Node.js 20 LTS ─────────────────────────────────────────────
info "Paso 2/7: Instalando Node.js ${NODE_VERSION} LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt install -y nodejs
  log "Node.js $(node -v) instalado."
else
  log "Node.js $(node -v) ya está instalado."
fi

# ─── 3. Clonar / actualizar repositorio ─────────────────────────────────────
info "Paso 3/7: Clonando repositorio..."
if [[ -d "$INSTALL_DIR/.git" ]]; then
  warn "El directorio $INSTALL_DIR ya existe. Actualizando..."
  cd "$INSTALL_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
  log "Repositorio actualizado."
else
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  log "Repositorio clonado en $INSTALL_DIR."
fi

cd "$INSTALL_DIR"

# ─── 4. Instalar dependencias npm ───────────────────────────────────────────
info "Paso 4/7: Instalando dependencias npm..."
npm install --production=false
log "Dependencias instaladas."

# ─── 5. Configurar variables de entorno ─────────────────────────────────────
info "Paso 5/7: Configurando variables de entorno..."

# Preguntar GEMINI_API_KEY si no existe o está vacía
if [[ ! -f .env ]] || ! grep -q "GEMINI_API_KEY=" .env || grep -q 'GEMINI_API_KEY=""' .env || grep -q "GEMINI_API_KEY=\"MY_GEMINI_API_KEY\"" .env; then
  read -rp "Ingresa tu GEMINI_API_KEY (obtenida de Google AI Studio): " GEMINI_KEY
  if [[ -z "$GEMINI_KEY" ]]; then
    err "GEMINI_API_KEY es requerida. Ejecuta el script nuevamente."
  fi
  cat > .env <<EOF
GEMINI_API_KEY="${GEMINI_KEY}"
NODE_ENV=production
APP_URL="http://localhost:${APP_PORT}"
EOF
  log "Archivo .env creado en $INSTALL_DIR/.env"
else
  log "El archivo .env ya existe y contiene una API Key."
fi

# ─── 6. Build del frontend ──────────────────────────────────────────────────
info "Paso 6/7: Compilando frontend para producción..."
npm run build
log "Frontend compilado en $INSTALL_DIR/dist/"

# ─── 7. Configurar PM2 ──────────────────────────────────────────────────────
info "Paso 7/7: Configurando demonio PM2..."

if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  log "PM2 instalado globalmente."
fi

# Detener instancia previa si existe
pm2 delete "$PM2_APP_NAME" 2>/dev/null || true

# Iniciar con tsx como intérprete (TypeScript en producción)
pm2 start server.ts --interpreter tsx --name "$PM2_APP_NAME" \
  --cwd "$INSTALL_DIR" \
  --env NODE_ENV=production \
  --log "$INSTALL_DIR/logs/pm2.log" \
  --merge-logs

# Guardar configuración para reinicio automático
pm2 save

# Configurar startup (crea systemd unit)
pm2 startup systemd -u root --hp /root 2>/dev/null || true
pm2 startup 2>/dev/null || true

log "PM2 configurado: $PM2_APP_NAME corriendo."

# ─── Configurar Firewall (UFW) ──────────────────────────────────────────────
info "Configurando firewall UFW..."
ufw --force reset 2>/dev/null || true
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow "$APP_PORT/tcp" comment "Saturno Web UI"
ufw --force enable
log "UFW configurado: puerto $APP_PORT abierto."

# ─── Crear estructura ContextP (si no existe) ───────────────────────────────
if [[ ! -d "$INSTALL_DIR/ContextP" ]]; then
  mkdir -p "$INSTALL_DIR/ContextP"/{_INDEX,CONTRACTS,TECH,FUNC,STRUCT,AUDIT/{success,failure},PARAMS}
  log "Estructura ContextP creada en $INSTALL_DIR/ContextP/"
fi

# ─── Verificación ───────────────────────────────────────────────────────────
info "Verificando instalación..."
sleep 3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/api/health" 2>/dev/null || echo "000")

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    INSTALACIÓN COMPLETADA                   ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Directorio:    $INSTALL_DIR"
echo "║  Puerto:        $APP_PORT"
echo "║  Servicio:      pm2 status $PM2_APP_NAME"
echo "║  Logs:          pm2 logs $PM2_APP_NAME"
echo "║  Reiniciar:     pm2 restart $PM2_APP_NAME"
echo "║                                                             ║"
if [[ "$HEALTH" == "200" ]]; then
  echo "║  Estado:        ${GREEN}CORRIENDO${NC} (HTTP $HEALTH)            ║"
else
  echo "║  Estado:        ${YELLOW}VERIFICAR${NC} (HTTP $HEALTH)           ║"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── Referencia rápida de comandos ──────────────────────────────────────────
cat <<EOF
Comandos útiles:
  Ver estado:        sudo pm2 status
  Ver logs:          sudo pm2 logs ${PM2_APP_NAME}
  Reiniciar:         sudo pm2 restart ${PM2_APP_NAME}
  Detener:           sudo pm2 stop ${PM2_APP_NAME}
  Health check:      curl http://localhost:${APP_PORT}/api/health
  Base de datos:     sqlite3 ${INSTALL_DIR}/saturno.db ".tables"
EOF
