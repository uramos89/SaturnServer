#!/bin/bash
# ============================================================
# Firewall Manager — iptables/ufw rule management
# Usage: ./script.sh <action> [port] [protocol] [ip] [chain]
# ============================================================
set -euo pipefail

ACTION="${1:-list}"
PORT="${2:-}"
PROTO="${3:-tcp}"
SOURCE_IP="${4:-}"
CHAIN="${5:-INPUT}"

echo "🛡️ Firewall Manager — Action: ${ACTION}"

# Detect available firewall
if command -v ufw &>/dev/null; then
  FW="ufw"
elif command -v iptables &>/dev/null; then
  FW="iptables"
else
  echo "❌ No firewall found (ufw or iptables)"
  exit 1
fi

echo "  Using: ${FW}"

case "$ACTION" in
  list|status)
    echo "📋 Current rules:"
    if [ "$FW" = "ufw" ]; then
      ufw status numbered
    else
      iptables -L "$CHAIN" -n --line-numbers 2>/dev/null || iptables -L -n --line-numbers
    fi
    ;;
  allow)
    if [ -z "$PORT" ]; then
      echo "❌ Port required. Usage: allow <port> [protocol] [source_ip]"
      exit 1
    fi
    echo "  ✅ Allowing ${PROTO} port ${PORT}${SOURCE_IP:+ from ${SOURCE_IP}}"
    if [ "$FW" = "ufw" ]; then
      if [ -n "$SOURCE_IP" ]; then
        ufw allow from "$SOURCE_IP" to any port "$PORT" proto "$PROTO"
      else
        ufw allow "$PORT"/"$PROTO"
      fi
    else
      if [ -n "$SOURCE_IP" ]; then
        iptables -A "$CHAIN" -p "$PROTO" --dport "$PORT" -s "$SOURCE_IP" -j ACCEPT
      else
        iptables -A "$CHAIN" -p "$PROTO" --dport "$PORT" -j ACCEPT
      fi
    fi
    echo "  ✅ Rule added"
    ;;
  deny)
    if [ -z "$PORT" ]; then
      echo "❌ Port required. Usage: deny <port> [protocol] [source_ip]"
      exit 1
    fi
    echo "  🔒 Denying ${PROTO} port ${PORT}${SOURCE_IP:+ from ${SOURCE_IP}}"
    if [ "$FW" = "ufw" ]; then
      if [ -n "$SOURCE_IP" ]; then
        ufw deny from "$SOURCE_IP" to any port "$PORT" proto "$PROTO"
      else
        ufw deny "$PORT"/"$PROTO"
      fi
    else
      if [ -n "$SOURCE_IP" ]; then
        iptables -A "$CHAIN" -p "$PROTO" --dport "$PORT" -s "$SOURCE_IP" -j DROP
      else
        iptables -A "$CHAIN" -p "$PROTO" --dport "$PORT" -j DROP
      fi
    fi
    echo "  ✅ Rule added"
    ;;
  delete)
    if [ -z "$PORT" ]; then
      echo "❌ Port required. Usage: delete <port> [protocol]"
      exit 1
    fi
    echo "  🗑️ Deleting ${PROTO} port ${PORT}"
    if [ "$FW" = "ufw" ]; then
      ufw delete allow "$PORT"/"$PROTO" 2>/dev/null || ufw delete deny "$PORT"/"$PROTO" 2>/dev/null || echo "  No matching rule found"
    else
      iptables -D "$CHAIN" -p "$PROTO" --dport "$PORT" -j ACCEPT 2>/dev/null || \
      iptables -D "$CHAIN" -p "$PROTO" --dport "$PORT" -j DROP 2>/dev/null || \
      echo "  No matching rule found"
    fi
    ;;
  disable)
    echo "  ⏸️ Disabling firewall..."
    if [ "$FW" = "ufw" ]; then
      ufw disable
    else
      iptables -P INPUT ACCEPT && iptables -P OUTPUT ACCEPT && iptables -P FORWARD ACCEPT && iptables -F
    fi
    echo "  ✅ Firewall disabled"
    ;;
  enable)
    echo "  ▶️ Enabling firewall..."
    if [ "$FW" = "ufw" ]; then
      ufw enable
    else
      # Set default policies
      iptables -P INPUT DROP
      iptables -P FORWARD DROP
      iptables -P OUTPUT ACCEPT
      # Allow established connections
      iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
      # Allow loopback
      iptables -A INPUT -i lo -j ACCEPT
      # Allow SSH (port 22)
      iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    fi
    echo "  ✅ Firewall enabled with safe defaults"
    ;;
  *)
    echo "❌ Unknown action: ${ACTION}"
    echo "Usage: $0 {list|allow|deny|delete|enable|disable} [port] [protocol] [source_ip]"
    exit 1
    ;;
esac

echo "✅ Firewall Manager complete"
