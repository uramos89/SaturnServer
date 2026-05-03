#!/bin/bash
# ============================================================
# Backup Manager — rsync-based automated backup
# Usage: ./script.sh <source> <destination> [retention_days] [exclude_patterns]
# ============================================================
set -euo pipefail

SOURCE="${1:-/data}"
DEST="${2:-/backup}"
RETENTION="${3:-30}"
EXCLUDE_RAW="${4:-*.tmp,*.log,cache}"
DRY_RUN="${5:-false}"

BACKUP_NAME="backup-$(hostname)-$(date +%Y%m%d_%H%M%S)"
BACKUP_PATH="${DEST}/${BACKUP_NAME}"
DATE_STAMP=$(date +%Y-%m-%d_%H:%M:%S)

echo "[${DATE_STAMP}] 🚀 Backup Manager iniciado"
echo "  Source:      ${SOURCE}"
echo "  Destination: ${BACKUP_PATH}"
echo "  Retention:   ${RETENTION} days"

# Validate source
if [ ! -d "$SOURCE" ]; then
  echo "  ❌ Source directory does not exist: $SOURCE"
  exit 1
fi

# Parse exclude patterns
EXCLUDE_ARGS=()
IFS=',' read -ra PATTERNS <<< "$EXCLUDE_RAW"
for pattern in "${PATTERNS[@]}"; do
  EXCLUDE_ARGS+=("--exclude=$pattern")
done

# Create backup destination
if [ "$DRY_RUN" = "true" ] || [ "$DRY_RUN" = "1" ]; then
  echo "  🏁 DRY RUN — no files will be copied"
  rsync -avh --dry-run "${EXCLUDE_ARGS[@]}" "$SOURCE" "${BACKUP_PATH}" 2>&1 | tail -5
  echo "  ✅ Dry run complete. ${RETENTION} day retention would apply to: ${DEST}/backup-*"
else
  mkdir -p "$BACKUP_PATH"
  echo "  📦 Running rsync..."
  rsync -avh --delete "${EXCLUDE_ARGS[@]}" "$SOURCE" "${BACKUP_PATH}" 2>&1 | tail -3
  echo "  ✅ Backup complete: ${BACKUP_PATH}"

  # Clean old backups
  echo "  🧹 Cleaning backups older than ${RETENTION} days..."
  find "${DEST}" -maxdepth 1 -name "backup-*" -type d -mtime +${RETENTION} -exec rm -rf {} \; 2>/dev/null
  echo "  ✅ Cleanup complete"

  # Show backup sizes
  du -sh "$BACKUP_PATH" 2>/dev/null
fi

echo "[$(date +%Y-%m-%d_%H:%M:%S)] ✅ Backup Manager finalizado"
