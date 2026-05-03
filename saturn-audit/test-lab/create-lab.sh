#!/bin/bash
# Saturn Test Lab — Docker containers con SSH válido
# Crea N servidores falsos para probar Saturn Server E2E

set -e

NET_NAME="saturn-lab"
CERTS_DIR="/home/ubuntu/.openclaw/workspace/saturn-audit/test-lab/keys"
SATURN_URL="http://192.168.174.134:3000"
ADMIN_USER="admin"
ADMIN_PASS="adminpass1"

# ── Colores ───────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

mkdir -p "$CERTS_DIR"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🧪 SATURN TEST LAB — Creando servidores falsos${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"

# ── 1. Create Docker network ────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Creating Docker network...${NC}"
docker network create "$NET_NAME" 2>/dev/null || true

# ── 2. Generate SSH keys ────────────────────────────────────────────
echo -e "${YELLOW}▶ Generating SSH key pair...${NC}"
ssh-keygen -t rsa -b 2048 -f "$CERTS_DIR/saturn_test_key" -N "" -q
SSH_PUB_KEY=$(cat "$CERTS_DIR/saturn_test_key.pub")

# ── 3. Create Dockerfiles for each server type ──────────────────────
create_server() {
  local NAME=$1
  local TAG=$2
  local OS_LABEL=$3
  local EXTRA_PKGS=$4
  local EXTRA_SCRIPT=$5

  echo ""
  echo -e "${YELLOW}▶ Building $NAME ($OS_LABEL)...${NC}"

  mkdir -p "/tmp/saturn-lab/$NAME"

  cat > "/tmp/saturn-lab/$NAME/Dockerfile" << DOCKEREOF
FROM $TAG
RUN apt-get update -qq && apt-get install -y -qq openssh-server sudo curl $EXTRA_PKGS 2>/dev/null || apk add --no-cache openssh sudo curl $EXTRA_PKGS 2>/dev/null || true

# Create test user
RUN useradd -m -s /bin/bash saturn_test 2>/dev/null || adduser -D -s /bin/sh saturn_test 2>/dev/null || true
RUN echo "saturn_test:TestPass123" | chpasswd 2>/dev/null || echo "saturn_test:TestPass123" | chpasswd 2>/dev/null || true
RUN echo "saturn_test ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers 2>/dev/null || echo "saturn_test ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers 2>/dev/null || true

# Add SSH key
RUN mkdir -p /home/saturn_test/.ssh && echo "$SSH_PUB_KEY" > /home/saturn_test/.ssh/authorized_keys && chmod 600 /home/saturn_test/.ssh/authorized_keys && chown -R saturn_test:saturn_test /home/saturn_test/.ssh 2>/dev/null || true

# Create test artifacts
RUN dd if=/dev/zero of=/var/log/test-app.log bs=1M count=10 2>/dev/null || true
RUN dd if=/dev/zero of=/tmp/large-file.bin bs=1M count=20 2>/dev/null || true

# Extra configuration
$EXTRA_SCRIPT

# SSH config
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config 2>/dev/null || true
RUN sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config 2>/dev/null || true
RUN mkdir -p /run/sshd

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]
DOCKEREOF

  docker build -t "saturn-test-$NAME" "/tmp/saturn-lab/$NAME" -q 2>/dev/null || {
    echo -e "${RED}  Failed to build $NAME${NC}"
    return 1
  }

  # Run container
  docker rm -f "saturn-$NAME" 2>/dev/null || true
  docker run -d --name "saturn-$NAME" \
    --network "$NET_NAME" \
    --hostname "$NAME.lab" \
    "saturn-test-$NAME" > /dev/null

  # Get IP
  local IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "saturn-$NAME")
  echo -e "${GREEN}  ✅ $NAME ($OS_LABEL) → $IP:22${NC}"
  echo "$IP $NAME.lab" >> /tmp/saturn-lab/hosts.txt
}

# ── 4. Create server variants ───────────────────────────────────────
rm -f /tmp/saturn-lab/hosts.txt

# Server 1: Standard Ubuntu 22.04 (typical production server)
create_server "web01" "ubuntu:22.04" "Ubuntu 22.04 LTS" "nginx htop" '
RUN echo "Simulating a web server..." && apt-get install -y -qq nginx 2>/dev/null && echo "<h1>Web01 Test Server</h1>" > /var/www/html/index.html || true
'

# Server 2: Ubuntu 20.04 (older, different OS detection)
create_server "db01" "ubuntu:20.04" "Ubuntu 20.04 LTS" "mysql-client" '
RUN echo "Simulating a database server..." && dd if=/dev/zero of=/var/lib/mysql/ibdata1 bs=1M count=50 2>/dev/null || true
'

# Server 3: Lightweight (Alpine)
create_server "monitor01" "alpine:3.19" "Alpine Linux 3.19" "" '
RUN mkdir -p /data/metrics && echo "cpu:45 mem:62 disk:78" > /data/metrics/current
'

# Server 4: Heavy load simulation
create_server "load01" "ubuntu:22.04" "Ubuntu 22.04 (High Load)" "stress-ng" '
RUN apt-get install -y -qq stress-ng 2>/dev/null || true
'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  📋 LAB READY — 4 servidores creados${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
cat /tmp/saturn-lab/hosts.txt
echo ""
echo -e "  User: ${BOLD}saturn_test${NC}"
echo -e "  Password: ${BOLD}TestPass123${NC}"
echo -e "  Key: ${BOLD}$CERTS_DIR/saturn_test_key${NC}"
echo ""
