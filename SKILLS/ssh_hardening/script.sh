#!/bin/bash
# ============================================================
# SSH Hardening — audit, apply CIS benchmarks, rotate port
# Usage: ./script.sh <action> [new_port]
# ============================================================
set -euo pipefail

ACTION="${1:-audit}"
NEW_PORT="${2:-2222}"
SSHD_CONFIG="/etc/ssh/sshd_config"
BACKUP="${SSHD_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔒 SSH Hardening — Action: ${ACTION}"

if [ ! -f "$SSHD_CONFIG" ]; then
  echo "❌ sshd_config not found at ${SSHD_CONFIG}"
  exit 1
fi

case "$ACTION" in
  audit)
    echo "📋 SSH Security Audit:"
    echo "  Config: ${SSHD_CONFIG}"
    echo ""
    echo "  🔑 PermitRootLogin: $(grep -i '^PermitRootLogin' $SSHD_CONFIG | awk '{print $2}' || echo 'not set')"
    echo "  🔑 PasswordAuthentication: $(grep -i '^PasswordAuthentication' $SSHD_CONFIG | awk '{print $2}' || echo 'not set')"
    echo "  🔑 PubkeyAuthentication: $(grep -i '^PubkeyAuthentication' $SSHD_CONFIG | awk '{print $2}' || echo 'not set')"
    echo "  🔌 Port: $(grep -i '^Port' $SSHD_CONFIG | awk '{print $2}' || echo '22 (default)')"
    echo "  🚫 MaxAuthTries: $(grep -i '^MaxAuthTries' $SSHD_CONFIG | awk '{print $2}' || echo 'not set')"
    echo "  🚫 ClientAliveInterval: $(grep -i '^ClientAliveInterval' $SSHD_CONFIG | awk '{print $2}' || echo 'not set')"
    echo "  🚫 ClientAliveCountMax: $(grep -i '^ClientAliveCountMax' $SSHD_CONFIG | awk '{print $2}' || echo 'not set')"
    echo "  🚫 AllowUsers: $(grep -i '^AllowUsers' $SSHD_CONFIG | awk '{print $2}' || echo 'not set')"
    echo "  🚫 Protocol: $(grep -i '^Protocol' $SSHD_CONFIG | awk '{print $2}' || echo 'not set (default 2)')"
    echo ""
    echo "  📊 Score:"
    issues=0
    grep -qi '^PermitRootLogin yes' $SSHD_CONFIG && echo "  ❌ Root login enabled" && issues=$((issues+1)) || echo "  ✅ Root login disabled"
    grep -qi '^PasswordAuthentication yes' $SSHD_CONFIG && echo "  ❌ Password auth enabled" && issues=$((issues+1)) || echo "  ✅ Password auth disabled"
    grep -qi '^PubkeyAuthentication no' $SSHD_CONFIG && echo "  ❌ Pubkey auth disabled" && issues=$((issues+1)) || echo "  ✅ Pubkey auth enabled"
    grep -qi '^Port 22' $SSHD_CONFIG && echo "  ⚠️ Default SSH port 22" && issues=$((issues+1)) || echo "  ✅ Non-default port"
    [ $issues -eq 0 ] && echo "  🟢 PASS (no issues found)" || echo "  🔴 ${issues} issue(s) found"
    ;;
  apply|full)
    echo "  🔧 Applying CIS SSH hardening benchmarks..."
    cp "$SSHD_CONFIG" "$BACKUP"
    echo "  💾 Backup: ${BACKUP}"

    # Disable root login
    sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' $SSHD_CONFIG || echo "PermitRootLogin no" >> $SSHD_CONFIG
    echo "  ✅ Root login disabled"

    # Disable password auth
    sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' $SSHD_CONFIG || echo "PasswordAuthentication no" >> $SSHD_CONFIG
    echo "  ✅ Password authentication disabled"

    # Enable pubkey auth
    sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' $SSHD_CONFIG || echo "PubkeyAuthentication yes" >> $SSHD_CONFIG
    echo "  ✅ Public key authentication enabled"

    # Limit auth tries
    sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' $SSHD_CONFIG || echo "MaxAuthTries 3" >> $SSHD_CONFIG
    echo "  ✅ MaxAuthTries set to 3"

    # Set client alive
    sed -i 's/^#*ClientAliveInterval.*/ClientAliveInterval 300/' $SSHD_CONFIG || echo "ClientAliveInterval 300" >> $SSHD_CONFIG
    sed -i 's/^#*ClientAliveCountMax.*/ClientAliveCountMax 2/' $SSHD_CONFIG || echo "ClientAliveCountMax 2" >> $SSHD_CONFIG
    echo "  ✅ Client alive configured (300s/2)"

    # Protocol 2 only
    sed -i 's/^#*Protocol.*/Protocol 2/' $SSHD_CONFIG || echo "Protocol 2" >> $SSHD_CONFIG
    echo "  ✅ Protocol 2 enforced"

    echo "  🔄 Testing config..."
    sshd -t && echo "  ✅ Config valid" || { echo "  ❌ Config invalid, restoring backup"; cp "$BACKUP" "$SSHD_CONFIG"; exit 1; }

    echo "  🔄 Restarting SSH..."
    systemctl restart sshd 2>/dev/null || systemctl restart ssh 2>/dev/null || service ssh restart 2>/dev/null
    echo "  ✅ SSH hardened successfully"
    ;;
  port-rotate)
    echo "  🔄 Changing SSH port to ${NEW_PORT}..."
    cp "$SSHD_CONFIG" "$BACKUP"

    if grep -qi '^Port' $SSHD_CONFIG; then
      sed -i "s/^#*Port.*/Port ${NEW_PORT}/" $SSHD_CONFIG
    else
      echo "Port ${NEW_PORT}" >> $SSHD_CONFIG
    fi
    echo "  ✅ Port changed to ${NEW_PORT}"

    sshd -t && echo "  ✅ Config valid" || { echo "  ❌ Invalid, restoring"; cp "$BACKUP" "$SSHD_CONFIG"; exit 1; }

    # Open new port in firewall if ufw is active
    if command -v ufw &>/dev/null && ufw status | grep -qi active; then
      ufw allow "${NEW_PORT}/tcp" && echo "  ✅ UFW: port ${NEW_PORT} allowed"
    fi

    systemctl restart sshd 2>/dev/null || systemctl restart ssh 2>/dev/null
    echo "  ✅ Port rotated to ${NEW_PORT} — connect with: ssh -p ${NEW_PORT}"
    ;;
  key-only)
    echo "  🔑 Disabling password authentication (key-only)..."
    cp "$SSHD_CONFIG" "$BACKUP"
    sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' $SSHD_CONFIG
    sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' $SSHD_CONFIG
    sshd -t && systemctl restart sshd 2>/dev/null || service ssh restart 2>/dev/null
    echo "  ✅ Key-only authentication enabled"
    ;;
  root-disable)
    echo "  🚫 Disabling root login..."
    cp "$SSHD_CONFIG" "$BACKUP"
    sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' $SSHD_CONFIG
    sshd -t && systemctl restart sshd 2>/dev/null || service ssh restart 2>/dev/null
    echo "  ✅ Root login disabled"
    ;;
  report)
    echo "📊 SSH Hardening Report:"
    echo "  Backup: ${BACKUP}"
    echo ""
    echo "  🔑 Key settings:"
    grep -E "^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|Port|MaxAuthTries|Protocol|AllowUsers|ClientAlive)" $SSHD_CONFIG | sed 's/^/  /'
    echo ""
    diff -u "$BACKUP" "$SSHD_CONFIG" 2>/dev/null && echo "  (no changes applied)" || echo "  (changes applied vs backup)"
    ;;
  *)
    echo "❌ Unknown action: ${ACTION}"
    echo "Usage: $0 {audit|apply|port-rotate|key-only|root-disable|report} [new_port]"
    exit 1
    ;;
esac

echo "✅ SSH Hardening complete"
