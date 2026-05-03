#!/bin/bash
set -euo pipefail
ACTION="${1:-list}"
DOMAIN="${2:-}"
ROOT="${3:-/var/www/html}"
echo "🌐 Apache Manager — Action: ${ACTION}"
case "$ACTION" in
  list) echo "📋 Sites:"; ls /etc/apache2/sites-available/ 2>/dev/null | sed 's/^/  • /' || echo "  (none)" ;;
  create-site)
    [ -z "$DOMAIN" ] && exit 1; mkdir -p "$ROOT"
    cat > "/etc/apache2/sites-available/${DOMAIN}.conf" << EOF
<VirtualHost *:80>
    ServerName ${DOMAIN}; DocumentRoot ${ROOT}; ErrorLog \${APACHE_LOG_DIR}/error.log
</VirtualHost>
EOF
    a2ensite "${DOMAIN}.conf" && systemctl reload apache2 && echo "  ✅ Site ${DOMAIN} created" ;;
  enable|disable)
    [ -z "$DOMAIN" ] && exit 1
    a2${ACTION}site "${DOMAIN}.conf" && systemctl reload apache2 && echo "  ✅ ${DOMAIN} ${ACTION}d" ;;
  ssl) [ -z "$DOMAIN" ] && exit 1; certbot --apache -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email 2>/dev/null || echo "  ⚠️ SSL failed" ;;
  modules) echo "📋 Modules:"; ls /etc/apache2/mods-enabled/ 2>/dev/null | sed 's/^/  • /' ;;
  test|reload|restart) apachectl configtest 2>&1 | head -3; [ "$ACTION" != "test" ] && systemctl "$ACTION" apache2 && echo "  ✅ Apache ${ACTION}ed" ;;
  *) echo "❌ Unknown action"; exit 1 ;;
esac
echo "✅ Apache Manager complete"
