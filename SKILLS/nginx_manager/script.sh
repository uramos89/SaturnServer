#!/bin/bash
set -euo pipefail
ACTION="${1:-list}"
DOMAIN="${2:-}"
ROOT="${3:-/var/www/html}"
PORT="${4:-80}"
SITES_AVAILABLE="/etc/nginx/sites-available"
SITES_ENABLED="/etc/nginx/sites-enabled"

echo "🌐 Nginx Manager — Action: ${ACTION}"
case "$ACTION" in
  list)
    echo "📋 Sites available:"
    ls -1 "$SITES_AVAILABLE" 2>/dev/null | sed 's/^/  • /' || echo "  (none)"
    echo "📋 Sites enabled:"
    ls -1 "$SITES_ENABLED" 2>/dev/null | sed 's/^/  • /' || echo "  (none)"
    ;;
  create-site)
    [ -z "$DOMAIN" ] && echo "❌ Domain required" && exit 1
    [ -d "$ROOT" ] || mkdir -p "$ROOT"
    cat > "${SITES_AVAILABLE}/${DOMAIN}" << EOF
server {
    listen ${PORT};
    server_name ${DOMAIN};
    root ${ROOT};
    index index.html index.htm;
    location / { try_files \$uri \$uri/ =404; }
}
EOF
    echo "  ✅ Site config created: ${DOMAIN}"
    ln -sf "${SITES_AVAILABLE}/${DOMAIN}" "${SITES_ENABLED}/${DOMAIN}" && echo "  ✅ Site enabled"
    nginx -t 2>&1 | head -1
    systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || echo "  Reload manually"
    ;;
  enable|disable)
    [ -z "$DOMAIN" ] && echo "❌ Domain required" && exit 1
    if [ "$ACTION" = "enable" ]; then
      ln -sf "${SITES_AVAILABLE}/${DOMAIN}" "${SITES_ENABLED}/${DOMAIN}" 2>/dev/null && echo "  ✅ ${DOMAIN} enabled" || echo "  ❌ Failed"
    else
      rm -f "${SITES_ENABLED}/${DOMAIN}" && echo "  ✅ ${DOMAIN} disabled" || echo "  ❌ Failed"
    fi
    systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null
    ;;
  ssl)
    [ -z "$DOMAIN" ] && echo "❌ Domain required" && exit 1
    echo "  🔐 SSL for ${DOMAIN}"
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email 2>/dev/null && \
    echo "  ✅ SSL configured" || echo "  ⚠️ SSL failed (certbot may not be configured)"
    ;;
  test|reload|restart)
    nginx -t 2>&1 | head -3
    [ "$ACTION" != "test" ] && systemctl "$ACTION" nginx && echo "  ✅ Nginx ${ACTION}ed"
    ;;
  *) echo "❌ Unknown action"; exit 1 ;;
esac
echo "✅ Nginx Manager complete"
