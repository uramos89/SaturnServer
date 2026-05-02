#!/bin/bash
# deploy-saturn.sh
# Ejecutar en el servidor REMOTO: saturno@192.168.174.130
# Uso: bash deploy-saturn.sh

set -e

REPO_URL="https://github.com/uramos89/SaturnServer.git"
APP_DIR="/home/saturno/saturn"
ENV_FILE="$APP_DIR/.env"

echo "========================================="
echo "  SATURN-X DEPLOYMENT - $(date)"
echo "========================================="

# 1. Dependencias del sistema
echo "[1/6] Verificando dependencias..."
if ! command -v node &> /dev/null; then
  echo "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v git &> /dev/null; then
  echo "Instalando git..."
  sudo apt-get install -y git
fi

NODE_VER=$(node --version)
echo "Node: $NODE_VER OK"

# 2. Clonar o actualizar el repositorio
echo "[2/6] Sincronizando código..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
  echo "Repositorio actualizado."
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
  echo "Repositorio clonado."
fi

# 3. Configurar variables de entorno
echo "[3/6] Configurando entorno..."
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
# Saturn Core - Environment (Servidor de Pruebas)
NODE_ENV=production
PORT=3000
APP_URL=http://192.168.174.130

# SEGURIDAD - Cambiar en producción real
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SSH_ENCRYPTION_PEPPER=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SATURN_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# AI - Opcional para pruebas
GEMINI_API_KEY=
EOF
  echo ".env creado con claves autogeneradas."
else
  echo ".env ya existe, no se sobrescribe."
fi

# 4. Instalar dependencias
echo "[4/6] Instalando dependencias npm..."
npm install

# 5. Build frontend
echo "[5/6] Compilando frontend..."
npm run build
if [ ! -d "dist" ]; then
  echo "ERROR: Build falló — no se encontró dist/"
  exit 1
fi

# 6. Iniciar con PM2
echo "[6/6] Iniciando servicio..."
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
fi

pm2 stop saturn 2>/dev/null || true
pm2 delete saturn 2>/dev/null || true

# Puerto 80 requiere permisos o redirección
# Si no eres root, usamos puerto 3000 con nginx como proxy
NODE_ENV=production pm2 start tsx --name saturn -- server.ts

pm2 save
pm2 status

echo "========================================="
echo "  Saturn corriendo - verificando..."
sleep 3
curl -s http://localhost:3000/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/api/health
echo ""
echo "  URL: http://192.168.174.130"
echo "  Log: pm2 logs saturn"
echo "========================================="
