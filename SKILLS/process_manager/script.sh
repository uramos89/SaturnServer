#!/bin/bash
# ============================================================
# Process Manager — list, monitor, search, kill processes
# Usage: ./script.sh <action> [target] [sort_by]
# ============================================================
set -euo pipefail

ACTION="${1:-list}"
TARGET="${2:-}"
SORT="${3:-cpu}"

echo "⚙️ Process Manager — Action: ${ACTION}"

case "$ACTION" in
  list)
    echo "📋 All processes (sorted by ${SORT}):"
    case "$SORT" in
      cpu)    ps aux --sort=-%cpu   | head -20 ;;
      memory) ps aux --sort=-%mem   | head -20 ;;
      pid)    ps aux --sort=pid     | head -20 ;;
      name)   ps aux --sort=comm    | head -20 ;;
      *)      ps aux --sort=-%cpu   | head -20 ;;
    esac
    ;;
  top)
    echo "🔥 Top resource consumers:"
    echo ""
    echo "=== CPU TOP 10 ==="
    ps aux --sort=-%cpu | head -10
    echo ""
    echo "=== MEMORY TOP 10 ==="
    ps aux --sort=-%mem | head -10
    ;;
  search)
    if [ -z "$TARGET" ]; then
      echo "❌ Search target required. Usage: search <pattern>"
      exit 1
    fi
    echo "🔍 Searching for: ${TARGET}"
    ps aux | grep -v grep | grep -i "${TARGET}" || echo "  No matching processes found"
    ;;
  kill)
    if [ -z "$TARGET" ]; then
      echo "❌ PID required. Usage: kill <pid>"
      exit 1
    fi
    if [[ "$TARGET" =~ ^[0-9]+$ ]]; then
      echo "  ⚠️ Killing PID: ${TARGET}"
      # First show what we're killing
      ps -p "$TARGET" -o pid,ppid,user,%cpu,%mem,cmd --no-headers 2>/dev/null || true
      kill "$TARGET" 2>/dev/null && echo "  ✅ Process ${TARGET} terminated" || echo "  ❌ Failed to kill PID ${TARGET}"
    else
      echo "  🔍 Searching and killing: ${TARGET}"
      pkill -f "${TARGET}" 2>/dev/null && echo "  ✅ Processes matching '${TARGET}' terminated" || echo "  No matching processes found"
    fi
    ;;
  monitor)
    echo "📊 Monitoring (3 snapshots, 2s间隔):"
    for i in 1 2 3; do
      echo ""
      echo "--- Snapshot $i ---"
      echo "CPU: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')% used"
      echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
      echo "Processes: $(ps aux | wc -l) total"
      sleep 2
    done
    ;;
  *)
    echo "❌ Unknown action: ${ACTION}"
    echo "Usage: $0 {list|top|search|kill|monitor} [target] [sort_by]"
    exit 1
    ;;
esac

echo ""
echo "✅ Process Manager complete"
