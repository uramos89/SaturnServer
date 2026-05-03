#!/bin/bash
# ============================================================
# Cron Manager — list, add, remove cron jobs
# Usage: ./script.sh <action> [schedule] [command] [label]
# ============================================================
set -euo pipefail

ACTION="${1:-list}"
SCHEDULE="${2:-}"
COMMAND="${3:-}"
LABEL="${4:-saturn-job}"
CRON_FILE="/tmp/saturn_cron_$$.tmp"

echo "⏰ Cron Manager — Action: ${ACTION}"

case "$ACTION" in
  list)
    echo "📋 Current crontab:"
    if crontab -l 2>/dev/null; then
      echo ""
      echo "Total jobs: $(crontab -l 2>/dev/null | grep -v '^#' | grep -v '^$' | wc -l)"
    else
      echo "  (no crontab for current user)"
    fi
    ;;
  add)
    if [ -z "$SCHEDULE" ] || [ -z "$COMMAND" ]; then
      echo "❌ Schedule and command required."
      echo "Usage: $0 add '<schedule>' '<command>' [label]"
      echo "  E.g.: $0 add '0 2 * * *' '/usr/bin/backup.sh' 'daily-backup'"
      exit 1
    fi
    # Validate cron expression (basic)
    if ! [[ "$SCHEDULE" =~ ^([0-9*,/\-]+|[a-z]+)\ ([0-9*,/\-]+|[a-z]+)\ ([0-9*,/\-]+|[a-z]+)\ ([0-9*,/\-]+|[a-z]+)\ ([0-9*,/\-]+|[a-z]+)$ ]]; then
      echo "⚠️ Warning: cron expression '$SCHEDULE' may be invalid"
    fi

    crontab -l 2>/dev/null > "$CRON_FILE" || true
    echo "# SATURN_JOB:${LABEL}" >> "$CRON_FILE"
    echo "$SCHEDULE $COMMAND # SATURN_JOB:${LABEL}" >> "$CRON_FILE"
    crontab "$CRON_FILE"
    rm -f "$CRON_FILE"
    echo "  ✅ Job added: ${SCHEDULE} ${COMMAND} (label: ${LABEL})"
    ;;
  remove)
    if [ -z "$LABEL" ]; then
      echo "❌ Label required to identify the job to remove."
      echo "Usage: $0 remove <label>"
      echo "  E.g.: $0 remove daily-backup"
      exit 1
    fi
    crontab -l 2>/dev/null > "$CRON_FILE" || true
    NEW_CRON=$(grep -v "SATURN_JOB:${LABEL}" "$CRON_FILE" || true)
    echo "$NEW_CRON" | crontab -
    rm -f "$CRON_FILE"
    echo "  ✅ Jobs with label '${LABEL}' removed"
    ;;
  enable|disable)
    if [ -z "$LABEL" ]; then
      echo "❌ Label required."
      exit 1
    fi
    crontab -l 2>/dev/null > "$CRON_FILE" || true
    if [ "$ACTION" = "disable" ]; then
      # Comment out matching lines
      sed -i "/SATURN_JOB:${LABEL}/s/^/#DISABLED: /" "$CRON_FILE"
      echo "  ⏸️ Disabled jobs with label '${LABEL}'"
    else
      # Uncomment disabled lines
      sed -i "/SATURN_JOB:${LABEL}/s/^#DISABLED: //" "$CRON_FILE"
      echo "  ▶️ Enabled jobs with label '${LABEL}'"
    fi
    crontab "$CRON_FILE"
    rm -f "$CRON_FILE"
    ;;
  *)
    echo "❌ Unknown action: ${ACTION}"
    echo "Usage: $0 {list|add|remove|enable|disable} [schedule] [command] [label]"
    exit 1
    ;;
esac

echo "✅ Cron Manager complete"
