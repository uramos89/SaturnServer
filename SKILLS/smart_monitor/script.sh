#!/bin/bash
# ============================================================
# SMART Disk Monitor — read disk health attributes
# Usage: ./script.sh <action> [disk]
# ============================================================
set -euo pipefail

ACTION="${1:-check}"
DISK="${2:-}"

echo "💾 SMART Disk Monitor — Action: ${ACTION}"

if ! command -v smartctl &>/dev/null; then
  echo "❌ smartctl not found. Install: sudo apt install smartmontools"
  exit 1
fi

# Detect disks
get_disks() {
  lsblk -dn -o NAME,TYPE | awk '$2=="disk" {print $1}'
}

if [ -z "$DISK" ]; then
  DISKS=$(get_disks)
else
  DISKS="$DISK"
fi

if [ -z "$DISKS" ]; then
  echo "❌ No disks found"
  exit 1
fi

case "$ACTION" in
  list)
    echo "📋 Available disks:"
    for d in $DISKS; do
      model=$(smartctl -i /dev/$d 2>/dev/null | grep "Device Model\|Model Number\|Product" | cut -d: -f2 | xargs)
      echo "  • /dev/${d}: ${model:-Unknown}"
    done
    ;;
  check|health)
    echo "🔍 Disk Health Check:"
    for d in $DISKS; do
      echo ""
      echo "  ── /dev/${d} ──"
      health=$(smartctl -H /dev/$d 2>/dev/null | grep "SMART overall-health\|SMART Health Status" | cut -d: -f2 | xargs)
      echo "  Health: ${health:-Unable to read}"
      
      temp=$(smartctl -A /dev/$d 2>/dev/null | grep -i "Temperature_Celsius\|Current Drive Temperature" | awk '{print $NF}')
      [ -n "$temp" ] && echo "  Temperature: ${temp}°C" || echo "  Temperature: N/A"

      realloc=$(smartctl -A /dev/$d 2>/dev/null | grep "Reallocated_Sector_Ct" | awk '{print $NF}')
      [ -n "$realloc" ] && echo "  Reallocated Sectors: ${realloc}" || echo "  Reallocated Sectors: N/A"

      pending=$(smartctl -A /dev/$d 2>/dev/null | grep "Current_Pending_Sector" | awk '{print $NF}')
      [ -n "$pending" ] && echo "  Pending Sectors: ${pending}" || echo "  Pending Sectors: N/A"

      power_on=$(smartctl -A /dev/$d 2>/dev/null | grep "Power_On_Hours" | awk '{print $NF}')
      [ -n "$power_on" ] && echo "  Power-On Hours: ${power_on}" || echo "  Power-On Hours: N/A"

      # Alert if issues
      alerts=""
      [ -n "$realloc" ] && [ "$realloc" -gt 0 ] 2>/dev/null && alerts="${alerts}⚠️ Reallocated sectors: ${realloc} "
      [ -n "$pending" ] && [ "$pending" -gt 0 ] 2>/dev/null && alerts="${alerts}⚠️ Pending sectors: ${pending} "
      [ -n "$temp" ] && [ "$temp" -gt 60 ] 2>/dev/null && alerts="${alerts}🔥 High temperature: ${temp}°C "
      [ -n "$alerts" ] && echo "  🚨 ALERTS: ${alerts}" || echo "  ✅ No issues detected"
    done
    ;;
  temperature)
    echo "🌡️ Disk Temperatures:"
    for d in $DISKS; do
      temp=$(smartctl -A /dev/$d 2>/dev/null | grep -i "Temperature_Celsius\|Current Drive Temperature" | awk '{print $NF}')
      if [ -n "$temp" ]; then
        [ "$temp" -gt 60 ] 2>/dev/null && icon="🔥" || icon="✅"
        echo "  ${icon} /dev/${d}: ${temp}°C"
      else
        echo "  ⚪ /dev/${d}: N/A"
      fi
    done
    ;;
  errors)
    echo "❌ Disk Errors:"
    for d in $DISKS; do
      echo ""
      echo "  ── /dev/${d} ──"
      realloc=$(smartctl -A /dev/$d 2>/dev/null | grep "Reallocated_Sector_Ct" | awk '{print $NF}')
      pending=$(smartctl -A /dev/$d 2>/dev/null | grep "Current_Pending_Sector" | awk '{print $NF}')
      offline=$(smartctl -A /dev/$d 2>/dev/null | grep "Offline_Uncorrectable" | awk '{print $NF}')
      
      echo "  Reallocated Sectors:  ${realloc:-N/A}"
      echo "  Pending Sectors:      ${pending:-N/A}"
      echo "  Offline Uncorrectable: ${offline:-N/A}"
      
      total_errors=$(smartctl -l error /dev/$d 2>/dev/null | grep "Error Log Version" | wc -l)
      echo "  SMART Error Log: ${total_errors} entries"
    done
    ;;
  all)
    echo "📊 Full SMART Data:"
    for d in $DISKS; do
      echo ""
      echo "  ═══════════════════════════════"
      echo "  Disk: /dev/${d}"
      echo "  ═══════════════════════════════"
      smartctl -i /dev/$d 2>/dev/null | grep -E "Device Model|Serial|Firmware|User Capacity|Rotation Rate|Form Factor" | sed 's/^/  /'
      echo ""
      smartctl -H /dev/$d 2>/dev/null | head -3 | sed 's/^/  /'
      echo ""
      echo "  Attributes:"
      smartctl -A /dev/$d 2>/dev/null | grep -E "Reallocated|Pending|Offline|Temperature|Power_On|UDMA_CRC|Read_Error|Write_Error|Spin_Retry|Reported_Uncorr|Command_Timeout" | awk '{printf "  %-30s %s\n", $2, $NF}'
    done
    ;;
  *)
    echo "❌ Unknown action: ${ACTION}"
    echo "Usage: $0 {check|all|temperature|errors|health|list} [disk]"
    exit 1
    ;;
esac

echo "✅ SMART Monitor complete"
