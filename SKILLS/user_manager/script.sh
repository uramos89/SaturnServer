#!/bin/bash
set -euo pipefail
ACTION="${1:-list}"
USERNAME="${2:-}"
GROUP="${3:-}"
SHELL="${4:-/bin/bash}"
SUDO="${5:-false}"

echo "👤 User Manager — Action: ${ACTION}"
case "$ACTION" in
  list)
    echo "📋 Users:"
    awk -F: '{printf "  • %s (UID=%s, GID=%s, shell=%s)\n", $1, $3, $4, $7}' /etc/passwd | sort
    echo ""
    echo "📋 Groups:"
    awk -F: '{printf "  • %s (GID=%s)\n", $1, $3}' /etc/group | sort
    ;;
  create)
    [ -z "$USERNAME" ] && echo "❌ Username required" && exit 1
    id "$USERNAME" &>/dev/null && echo "⚠️ User ${USERNAME} already exists" || {
      useradd -m -s "$SHELL" "$USERNAME"
      echo "  ✅ User ${USERNAME} created (shell: ${SHELL})"
      [ "$SUDO" = "true" ] && usermod -aG sudo "$USERNAME" && echo "  ✅ Sudo access granted"
    }
    ;;
  delete)
    [ -z "$USERNAME" ] && echo "❌ Username required" && exit 1
    userdel -r "$USERNAME" 2>/dev/null && echo "  ✅ User ${USERNAME} deleted" || echo "  ❌ Failed to delete ${USERNAME}"
    ;;
  add-group)
    [ -z "$USERNAME" ] && echo "❌ Username required" && exit 1
    [ -z "$GROUP" ] && echo "❌ Group required" && exit 1
    usermod -aG "$GROUP" "$USERNAME" && echo "  ✅ ${USERNAME} added to ${GROUP}"
    ;;
  remove-group)
    [ -z "$USERNAME" ] && echo "❌ Username required" && exit 1
    [ -z "$GROUP" ] && echo "❌ Group required" && exit 1
    gpasswd -d "$USERNAME" "$GROUP" && echo "  ✅ ${USERNAME} removed from ${GROUP}"
    ;;
  lock)
    [ -z "$USERNAME" ] && echo "❌ Username required" && exit 1
    passwd -l "$USERNAME" && echo "  🔒 User ${USERNAME} locked"
    ;;
  unlock)
    [ -z "$USERNAME" ] && echo "❌ Username required" && exit 1
    passwd -u "$USERNAME" && echo "  🔓 User ${USERNAME} unlocked"
    ;;
  *) echo "❌ Unknown action"; exit 1 ;;
esac
echo "✅ User Manager complete"
