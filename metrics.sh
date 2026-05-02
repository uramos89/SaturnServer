#!/bin/bash
cpu_usage=$(top -bn1 | grep "%Cpu" | awk "{print 100 - \$8}")
cpu_pct=$(printf "%.1f%%" $cpu_usage)
mem_total=$(grep MemTotal /proc/meminfo | awk "{print \$2}")
mem_avail=$(grep MemAvailable /proc/meminfo | awk "{print \$2}")
ram_pct=$(awk "BEGIN {printf \"%.1f%%\", ($mem_total - $mem_avail) / $mem_total * 100}")
disk_pct=$(df -h / | awk "NR==2 {print \$5}")
uptime_seconds=$(awk "{print int(\$1)}" /proc/uptime)
uptime_days=$((uptime_seconds / 86400))
uptime_str="${uptime_days}d"
echo "CPU        RAM        DISK        UPTIME"
echo "$cpu_pct   $ram_pct   $disk_pct       $uptime_str"
