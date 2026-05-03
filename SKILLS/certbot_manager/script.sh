#!/bin/bash
# ============================================================
# SSL/Certbot Manager — obtain, renew, list SSL certificates
# Usage: ./script.sh <action> [domain] [email] [webroot]
# ============================================================
set -euo pipefail

ACTION="${1:-list}"
DOMAIN="${2:-}"
EMAIL="${3:-}"
WEBROOT="${4:-/var/www/html}"

echo "🔐 SSL/Certbot Manager — Action: ${ACTION}"

# Check certbot availability
if ! command -v certbot &>/dev/null; then
  echo "❌ certbot not installed. Install it: sudo apt install certbot"
  exit 1
fi

case "$ACTION" in
  list)
    echo "📋 Certificates:"
    certbot certificates 2>/dev/null || echo "  No certificates found"
    ;;
  obtain)
    if [ -z "$DOMAIN" ]; then
      echo "❌ Domain required. Usage: obtain <domain> [email] [webroot]"
      exit 1
    fi
    echo "  🔑 Obtaining certificate for: ${DOMAIN}"
    CMD="certbot certonly --webroot -w ${WEBROOT} -d ${DOMAIN} --non-interactive --agree-tos"
    if [ -n "$EMAIL" ]; then
      CMD="$CMD --email ${EMAIL}"
    else
      CMD="$CMD --register-unsafely-without-email"
    fi
    eval "$CMD"
    echo "  ✅ Certificate obtained for ${DOMAIN}"
    ;;
  renew)
    echo "  🔄 Renewing certificates..."
    certbot renew --non-interactive
    echo "  ✅ Renewal complete"
    ;;
  expiry)
    echo "  📅 Certificate expiry dates:"
    certbot certificates 2>/dev/null | grep -E "Domains|Expiry Date|Certificate Path" || echo "  No certificates"
    echo ""
    echo "  ⏰ Days until expiry:"
    for cert in /etc/letsencrypt/live/*/cert.pem; do
      if [ -f "$cert" ]; then
        domain=$(basename $(dirname "$cert"))
        expiry=$(openssl x509 -enddate -noout -in "$cert" | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo 0)
        now_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
        if [ "$days_left" -lt 30 ]; then
          echo "  🔴 ${domain}: ${days_left} days (RENEW SOON)"
        elif [ "$days_left" -lt 60 ]; then
          echo "  🟡 ${domain}: ${days_left} days"
        else
          echo "  🟢 ${domain}: ${days_left} days"
        fi
      fi
    done
    ;;
  revoke)
    if [ -z "$DOMAIN" ]; then
      echo "❌ Domain required. Usage: revoke <domain>"
      exit 1
    fi
    echo "  ⚠️ Revoking certificate for: ${DOMAIN}"
    certbot revoke --non-interactive --cert-name "$DOMAIN" 2>/dev/null || \
    certbot revoke --non-interactive -d "$DOMAIN" 2>/dev/null || \
    echo "  Could not revoke. Certificate may not exist."
    echo "  ✅ Certificate revoked (if existed)"
    ;;
  *)
    echo "❌ Unknown action: ${ACTION}"
    echo "Usage: $0 {list|obtain|renew|expiry|revoke} [domain] [email] [webroot]"
    exit 1
    ;;
esac

echo "✅ SSL/Certbot Manager complete"
