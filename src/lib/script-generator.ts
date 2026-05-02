// ── Saturn Script Generator ─────────────────────────────────────────────
// Generates bash (Linux) and PowerShell (Windows) scripts for server admin
// Each method returns { script, description, risks, rollbackScript?, estimatedTime }

import type { OSType, ScriptRequest, ScriptResponse } from "./types.js";

export class ScriptGenerator {
  static generate(req: ScriptRequest): ScriptResponse {
    const { category, action, os, params } = req;
    const method = `${category}_${action}`;
    const handler = (ScriptGenerator as any)[method];
    if (typeof handler === "function") {
      return handler.call(ScriptGenerator, os, params);
    }
    // Fallback: generate a generic command
    const p = params as any;
    return this.genericCommand(os, p.command || `${category} ${action}`);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private static shebang(os: OSType): string {
    return os === "windows" ? "@echo off\r\n" : "#!/bin/bash\nset -euo pipefail\n";
  }

  private static dryRunGuard(os: OSType, dryRun?: boolean): string {
    if (!dryRun) return "";
    return os === "windows"
      ? "echo [DRY-RUN] Mode enabled - WhatIf\nset \"_WHATIF=-WhatIf\"\n"
      : 'echo "[DRY-RUN] Mode enabled"\n_DRY_RUN=true\n';
  }

  private static errorHandler(os: OSType): string {
    return os === "windows"
      ? 'if %errorlevel% neq 0 ( echo "ERROR: Command failed with code %errorlevel%" & exit /b %errorlevel% )\n'
      : 'if [ $? -ne 0 ]; then echo "ERROR: Command failed"; exit 1; fi\n';
  }

  private static requireRoot(os: OSType): string {
    return os === "windows"
      ? 'net session >nul 2>&1\nif %errorlevel% neq 0 ( echo "ERROR: Administrator privileges required" & exit /b 1 )\n'
      : 'if [ "$(id -u)" -ne 0 ]; then echo "ERROR: Root privileges required" >&2; exit 1; fi\n';
  }

  private static buildResponse(
    script: string,
    description: string,
    risks: string[],
    estimatedTime: string,
    rollbackScript?: string
  ): ScriptResponse {
    return { script, description, risks, estimatedTime, rollbackScript };
  }

  private static genericCommand(os: OSType, command: string): ScriptResponse {
    const script = os === "windows"
      ? `${ScriptGenerator.shebang(os)}${ScriptGenerator.errorHandler(os)}\n${command}\n`
      : `${ScriptGenerator.shebang(os)}${ScriptGenerator.errorHandler(os)}\n${command}\n`;
    return ScriptGenerator.buildResponse(script, `Execute: ${command}`, ["Generic command - review before execution"], "1m");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // S01 - Users
  // ═══════════════════════════════════════════════════════════════════════

  static users_list(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
powershell -Command "$users = @(Get-LocalUser); if($users.Count -gt 0){ $users | ForEach-Object { $groups = @(Get-LocalGroup | Where-Object { (Get-LocalGroupMember -Group $_ -ErrorAction SilentlyContinue).Name -match $_.Name } | Select-Object -ExpandProperty Name); [PSCustomObject]@{ username=$_.Name; active=$_.Enabled; description=($_.Description + ''); groups=($groups -join ', ') } } | ConvertTo-Json -Compress } else { echo '[]' }"
`;
      return ScriptGenerator.buildResponse(script, "List local users as JSON", ["Read-only operation"], "30s");
    }
    const script = `${ScriptGenerator.shebang(os)}
# Linux users list
awk -F: '$3>=1000 || $3==0 {print $1 "|" $3 "|" $6 "|" $7}' /etc/passwd | awk -F'|' 'BEGIN{printf "["} {if(NR>1)printf ","; printf "{\\"username\\":\\"%s\\",\\"uid\\":\\"%s\\",\\"home\\":\\"%s\\",\\"shell\\":\\"%s\\",\\"groups\\":\\"N/A\\"}", $1, $2, $3, $4} END{print "]"}'
`;
    return ScriptGenerator.buildResponse(script, "List system users as JSON", ["Read-only operation"], "30s");
  }

  static users_create(os: OSType, params: Record<string, any>): ScriptResponse {
    const { username, password, groups, shell, homeDir } = params;
    if (!username) return ScriptGenerator.buildResponse("", "ERROR: username required", [], "0s");

    if (os === "windows") {
      const pwCmd = password ? `$secPw = ConvertTo-SecureString "${password}" -AsPlainText -Force` : "";
      const groupCmd = groups ? groups.map((g: string) => `Add-LocalGroupMember -Group "${g}" -Member "${username}"`).join("\n") : "";
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
echo "Creating user ${username}..."
${pwCmd}
if (-not (Get-LocalUser -Name "${username}" -ErrorAction SilentlyContinue)) {
  New-LocalUser -Name "${username}" ${password ? '-Password $secPw' : '-NoPassword'} -PasswordNeverExpires
  echo "User ${username} created successfully"
} else {
  echo "User ${username} already exists - skipping"
}
${groupCmd}
echo "Done"
`;
      return ScriptGenerator.buildResponse(script, `Create user ${username} on Windows`, ["Creates local user account"], "1m",
        `${ScriptGenerator.shebang(os)}\nRemove-LocalUser -Name "${username}"\necho "User ${username} removed"\n`);
    }

    // Linux
    const homeFlag = homeDir ? `-d ${homeDir}` : "-m";
    const shellFlag = shell ? `-s ${shell}` : "-s /bin/bash";
    const groupFlag = groups ? `-G ${groups.join(",")}` : "";
    const pwCmd = password ? `echo '${username}:${password}' | chpasswd` : "passwd -l ${username}";
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
if id "${username}" &>/dev/null; then
  echo "User ${username} already exists - skipping"
else
  useradd ${homeFlag} ${shellFlag} ${groupFlag} "${username}"
  echo "User ${username} created (home: ${homeDir || "/home/" + username})"
  ${pwCmd}
  echo "Password set for ${username}"
fi
`;
    return ScriptGenerator.buildResponse(script, `Create user ${username} on Linux`, ["Creates system user account"], "1m",
      `${ScriptGenerator.shebang(os)}\n${ScriptGenerator.requireRoot(os)}\nuserdel -r "${username}"\necho "User ${username} removed"\n`);
  }

  static users_delete(os: OSType, params: Record<string, any>): ScriptResponse {
    const { username } = params;
    if (!username) return ScriptGenerator.buildResponse("", "ERROR: username required", [], "0s");

    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
if (Get-LocalUser -Name "${username}" -ErrorAction SilentlyContinue) {
  Remove-LocalUser -Name "${username}"
  echo "User ${username} deleted"
} else {
  echo "User ${username} not found"
}
`;
      return ScriptGenerator.buildResponse(script, `Delete user ${username}`, ["Irreversible - removes user account"], "30s");
    }
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
if id "${username}" &>/dev/null; then
  userdel -r "${username}" 2>/dev/null || userdel "${username}"
  echo "User ${username} deleted"
else
  echo "User ${username} not found"
fi
`;
    return ScriptGenerator.buildResponse(script, `Delete user ${username}`, ["Irreversible - removes user and home directory"], "30s");
  }

  static users_lock(os: OSType, params: Record<string, any>): ScriptResponse {
    const { username, locked } = params;
    if (!username) return ScriptGenerator.buildResponse("", "ERROR: username required", [], "0s");

    if (os === "windows") {
      const action = locked ? "Disable" : "Enable";
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
Set-LocalUser -Name "${username}" -${action === "Disable" ? "Enabled:$false" : "Enabled:$true"}
echo "User ${username} ${action.toLowerCase()}d"
`;
      return ScriptGenerator.buildResponse(script, `${locked ? "Lock" : "Unlock"} user ${username}`, ["Affects user login ability"], "10s");
    }
    const cmd = locked ? `passwd -l "${username}"` : `passwd -u "${username}"`;
    const action = locked ? "locked" : "unlocked";
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
if id "${username}" &>/dev/null; then
  ${cmd}
  echo "User ${username} ${action}"
else
  echo "User ${username} not found"
fi
`;
    return ScriptGenerator.buildResponse(script, `${locked ? "Lock" : "Unlock"} user ${username}`, ["Affects user login ability"], "10s");
  }

  static users_groups(os: OSType, params: Record<string, any>): ScriptResponse {
    const { username, groups, groupAction } = params;
    if (!username || !groups) return ScriptGenerator.buildResponse("", "ERROR: username and groups required", [], "0s");

    if (os === "windows") {
      const cmd = groupAction === "add"
        ? groups.map((g: string) => `Add-LocalGroupMember -Group "${g}" -Member "${username}"`).join("\n")
        : groups.map((g: string) => `Remove-LocalGroupMember -Group "${g}" -Member "${username}"`).join("\n");
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
${cmd}
echo "Done"
`;
      return ScriptGenerator.buildResponse(script, `${groupAction} groups for ${username}`, ["Modifies group membership"], "30s");
    }
    const cmd = groupAction === "add"
      ? groups.map((g: string) => `usermod -aG "${g}" "${username}"`).join("\n")
      : groups.map((g: string) => `gpasswd -d "${username}" "${g}"`).join("\n");
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
if id "${username}" &>/dev/null; then
  ${cmd}
  echo "Groups modified for ${username}"
else
  echo "User ${username} not found"
fi
`;
    return ScriptGenerator.buildResponse(script, `${groupAction} groups for ${username}`, ["Modifies group membership"], "30s");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // S02 - Scheduled Tasks
  // ═══════════════════════════════════════════════════════════════════════

  static tasks_list(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
powershell -Command "$tasks = @(Get-ScheduledTask | Where-Object { $_.State -ne 'Disabled' } | Select-Object -First 30); if($tasks.Count -gt 0){ $tasks | ForEach-Object { $info = $_ | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue; [PSCustomObject]@{ name=$_.TaskName; state=$_.State; nextRun=(if($info.NextRunTime){$info.NextRunTime.ToString()}else{'N/A'}); path=$_.TaskPath } } | ConvertTo-Json -Compress } else { echo '[]' }"
`;
      return ScriptGenerator.buildResponse(script, "List scheduled tasks as JSON", ["Read-only operation"], "30s");
    }
    const script = `${ScriptGenerator.shebang(os)}
# Linux: Combine systemd timers and crontab
(
  echo "["
  # Systemd timers
  systemctl list-timers --all --no-pager --no-legend 2>/dev/null | awk '{printf "{\\"name\\":\\"%s\\",\\"state\\":\\"%s\\",\\"nextRun\\":\\"%s %s\\",\\"path\\":\\"systemd\\"},", $6, $4, $1, $2}'
  # Crontab
  crontab -l 2>/dev/null | grep -v "^#" | awk '{gsub(/"/,"\\\\\""); printf "{\\"name\\":\\"cron\\",\\"state\\":\\"active\\",\\"nextRun\\":\\"cron\\",\\"path\\":\\"%s\\"},", $0}'
  echo "null]"
) | sed 's/,null/ /g' | sed 's/null//g'
`;
    return ScriptGenerator.buildResponse(script, "List scheduled tasks as JSON", ["Read-only operation"], "30s");
  }

  static tasks_create(os: OSType, params: Record<string, any>): ScriptResponse {
    const { schedule, command, name } = params;
    if (!schedule || !command) return ScriptGenerator.buildResponse("", "ERROR: schedule and command required", [], "0s");

    if (os === "windows") {
      const taskName = name || `SaturnTask_${Date.now()}`;
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
schtasks /Create /TN "${taskName}" /TR "${command}" /SC ${schedule} /F
echo "Task ${taskName} created"
`;
      return ScriptGenerator.buildResponse(script, `Create scheduled task ${taskName}`, ["Creates Windows scheduled task"], "1m",
        `${ScriptGenerator.shebang(os)}\nschtasks /Delete /TN "${taskName}" /F\necho "Task ${taskName} deleted"\n`);
    }
    const cronLine = `${schedule} ${command}`;
    const taskName = name || `saturn-${Date.now()}`;
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
(crontab -l 2>/dev/null; echo "# ${taskName} - ${new Date().toISOString()}")
(crontab -l 2>/dev/null; echo "${cronLine}") | crontab -
echo "Cron job added: ${cronLine}"
`;
    return ScriptGenerator.buildResponse(script, `Create cron job: ${cronLine}`, ["Adds entry to crontab"], "1m",
      `${ScriptGenerator.shebang(os)}\n${ScriptGenerator.requireRoot(os)}\ncrontab -l 2>/dev/null | grep -v "# ${taskName}" | grep -v "${cronLine}" | crontab -\necho "Cron job removed"\n`);
  }

  static tasks_delete(os: OSType, params: Record<string, any>): ScriptResponse {
    const { taskId } = params;
    if (!taskId) return ScriptGenerator.buildResponse("", "ERROR: taskId required", [], "0s");

    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
schtasks /Delete /TN "${taskId}" /F
echo "Task ${taskId} deleted"
`;
      return ScriptGenerator.buildResponse(script, `Delete task ${taskId}`, ["Irreversible"], "30s");
    }
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
crontab -l 2>/dev/null | grep -v "${taskId}" | crontab -
echo "Task ${taskId} removed from crontab"
`;
    return ScriptGenerator.buildResponse(script, `Delete task ${taskId}`, ["Removes from crontab"], "30s");
  }

  static processes_list(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
powershell -Command "$res = Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 | Select-Object @{Name='pid';Expression={$_.Id}}, @{Name='user';Expression={'N/A'}}, @{Name='name';Expression={$_.ProcessName}}, @{Name='cpu';Expression={[math]::Round($_.CPU, 2)}}, @{Name='mem';Expression={[math]::Round($_.WorkingSet64 / 1MB, 2)}}, @{Name='state';Expression={if($_.Responding){'Running'}else{'Not Responding'}}}; if($res -is [Array]){ $res | ConvertTo-Json -Compress } else { @($res) | ConvertTo-Json -Compress }"
`;
      return ScriptGenerator.buildResponse(script, "List top 20 processes as JSON", ["Read-only operation"], "30s");
    }
    const script = `${ScriptGenerator.shebang(os)}
ps -eo pcpu,pmem,pid,user,stat,comm --sort=-pcpu 2>/dev/null | head -21 | tail -20 | awk 'BEGIN{printf "["} {if(NR>1)printf ","; printf "{\\"cpu\\":\\"%s%%\\",\\"mem\\":\\"%s%%\\",\\"pid\\":\\"%s\\",\\"user\\":\\"%s\\",\\"state\\":\\"%s\\",\\"name\\":\\"%s\\"}", $1, $2, $3, $4, $5, $6} END{print "]"}'
`;
    return ScriptGenerator.buildResponse(script, "List top 20 processes as JSON", ["Read-only operation"], "30s");
  }

  static processes_kill(os: OSType, params: Record<string, any>): ScriptResponse {
    const { pid, signal } = params;
    if (!pid) return ScriptGenerator.buildResponse("", "ERROR: pid required", [], "0s");

    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
Stop-Process -Id ${pid} -Force
echo "Process ${pid} terminated"
`;
      return ScriptGenerator.buildResponse(script, `Kill process ${pid}`, ["Forcefully terminates process"], "10s");
    }
    const sig = signal || "SIGTERM";
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.errorHandler(os)}
if kill -${sig} ${pid} 2>/dev/null; then
  echo "Process ${pid} killed with ${sig}"
else
  echo "Failed to kill process ${pid} - check permissions or if process exists"
fi
`;
    return ScriptGenerator.buildResponse(script, `Kill process ${pid} with ${sig}`, ["Terminates a running process"], "10s");
  }

  static processes_renice(os: OSType, params: Record<string, any>): ScriptResponse {
    const { pid, priority } = params;
    if (!pid || priority === undefined) return ScriptGenerator.buildResponse("", "ERROR: pid and priority required", [], "0s");

    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
renice ${priority} -p ${pid}
echo "Process ${pid} reniced to ${priority}"
`;
    return ScriptGenerator.buildResponse(script, `Renice process ${pid} to ${priority}`, ["Changes process priority (-20 to 19)"], "10s");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // S04 - Monitoring
  // ═══════════════════════════════════════════════════════════════════════

  static monitoring_snapshot(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
echo "=== CPU ==="
powershell -Command "$cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average; Write-Host \"CPU: $($cpu.Average)%\""
echo "=== Memory ==="
powershell -Command "$os = Get-CimInstance Win32_OperatingSystem; $pct = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100, 1); Write-Host \"Memory: $pct%\""
echo "=== Disk ==="
powershell -Command "Get-Volume | Where-Object DriveType -eq 'Fixed' | Select-Object DriveLetter,SizeRemaining,Size | Format-Table -AutoSize"
echo "=== Network ==="
powershell -Command "Get-NetAdapterStatistics | Select-Object Name,ReceivedBytes,SentBytes | Format-Table -AutoSize"
`;
      return ScriptGenerator.buildResponse(script, "System resource snapshot (CPU, RAM, Disk, Network)", ["Read-only operation"], "30s");
    }
    const script = `${ScriptGenerator.shebang(os)}
echo "=== CPU ==="
top -bn1 | grep "Cpu(s)" | awk '{print "CPU: " $2 "% user, " $4 "% system, " $8 "% idle"}'
echo ""
echo "=== Memory ==="
free -h | grep -v +
echo ""
echo "=== Disk ==="
df -h | grep -v tmpfs | grep -v overlay
echo ""
echo "=== Network ==="
cat /proc/net/dev | grep -v lo | grep -v Inter | awk '{print $1 ": RX=" $2 " bytes, TX=" $10 " bytes"}'
echo ""
echo "=== Load Average ==="
cat /proc/loadavg
echo ""
echo "=== Uptime ==="
uptime
`;
    return ScriptGenerator.buildResponse(script, "System resource snapshot (CPU, RAM, Disk, Network)", ["Read-only operation"], "30s");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // S05 - Logs
  // ═══════════════════════════════════════════════════════════════════════

  static logs_get(os: OSType, params: Record<string, any>): ScriptResponse {
    const { lines, service } = params;
    const n = lines || "50";

    if (os === "windows") {
      const filter = service ? `| Where-Object ProviderName -eq '${service}'` : "";
      const script = `${ScriptGenerator.shebang(os)}
echo "=== System Logs (last ${n} entries) ==="
powershell -Command "Get-WinEvent -LogName System -MaxEvents ${n} ${filter} | Select-Object TimeCreated,Id,LevelDisplayName,Message | Format-Table -AutoSize -Wrap"
`;
      return ScriptGenerator.buildResponse(script, `Get last ${n} system log entries`, ["Read-only operation"], "30s");
    }
    const journalCmd = service
      ? `journalctl -u ${service} -n ${n} --no-pager`
      : `journalctl -n ${n} --no-pager`;
    const script = `${ScriptGenerator.shebang(os)}
echo "=== System Logs (last ${n} entries) ==="
${journalCmd} 2>/dev/null || tail -${n} /var/log/syslog 2>/dev/null || tail -${n} /var/log/messages 2>/dev/null || echo "(no logs available)"
`;
    return ScriptGenerator.buildResponse(script, `Get last ${n} log entries${service ? ` for ${service}` : ""}`, ["Read-only operation"], "30s");
  }

  static logs_rotate(os: OSType, params: Record<string, any>): ScriptResponse {
    const { service } = params;

    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
echo "Rotating Windows Event Logs..."
wevtutil cl System
wevtutil cl Application
wevtutil cl Security
echo "Event logs cleared"
`;
      return ScriptGenerator.buildResponse(script, "Clear Windows event logs", ["Clears all event logs - irreversible"], "1m");
    }
    const logCmd = service
      ? `logrotate -f /etc/logrotate.d/${service} 2>/dev/null || echo "No logrotate config for ${service}"`
      : "logrotate -f /etc/logrotate.conf 2>/dev/null || echo 'logrotate not configured'";
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
${logCmd}
echo "Log rotation completed"
`;
    return ScriptGenerator.buildResponse(script, `Rotate logs${service ? ` for ${service}` : ""}`, ["Forces log rotation"], "1m");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // N01 - Network
  // ═══════════════════════════════════════════════════════════════════════

  static network_list(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
powershell -Command "$res = @(Get-NetIPConfiguration | ForEach-Object { [PSCustomObject]@{ iface = $_.InterfaceAlias; status = ($_.NetAdapter.Status -if $null -eq $_.NetAdapter.Status -then 'Unknown' -else $_.NetAdapter.Status); ip = ($_.IPv4Address.IPAddress -if $null -eq $_.IPv4Address.IPAddress -then 'N/A' -else $_.IPv4Address.IPAddress); mask = ($_.IPv4DefaultGateway.PrefixLength -if $null -eq $_.IPv4DefaultGateway.PrefixLength -then '0' -else $_.IPv4DefaultGateway.PrefixLength); mac = ($_.NetAdapter.LinkLayerAddress -if $null -eq $_.NetAdapter.LinkLayerAddress -then 'N/A' -else $_.NetAdapter.LinkLayerAddress); gateway = ($_.IPv4DefaultGateway.NextHop -if $null -eq $_.IPv4DefaultGateway.NextHop -then 'None' -else $_.IPv4DefaultGateway.NextHop); dns = ($_.DNSServer.ServerAddresses -join ',') } }); if($res.Count -gt 0){ $res | ConvertTo-Json -Compress } else { echo '[]' }"
`;
      return ScriptGenerator.buildResponse(script, "List network interfaces as JSON", ["Read-only operation"], "30s");
    }
    const script = `${ScriptGenerator.shebang(os)}
# Linux: Prefer ip command, fallback to ifconfig
if command -v ip &>/dev/null; then
  ip -o addr show 2>/dev/null | awk 'BEGIN{printf "["} {if(NR>1)printf ","; split($4,a,"/"); printf "{\\"iface\\":\\"%s\\",\\"status\\":\\"UP\\",\\"ip\\":\\"%s\\",\\"mask\\":\\"%s\\",\\"mac\\":\\"N/A\\",\\"gateway\\":\\"N/A\\",\\"dns\\":\\"N/A\\"}", $2, a[1], a[2]} END{print "]"}'
elif command -v ifconfig &>/dev/null; then
  ifconfig 2>/dev/null | awk 'BEGIN{printf "["} /^[a-z]/ {if(p)printf ","; split($1,i,":"); printf "{\\"iface\\":\\"%s\\",\\"status\\":\\"UP\\",\\"ip\\":\\"N/A\\",\\"mask\\":\\"N/A\\",\\"mac\\":\\"N/A\\",\\"gateway\\":\\"N/A\\",\\"dns\\":\\"N/A\\"}", i[1]; p=1} END{print "]"}'
else
  echo "[]"
fi
`;
    return ScriptGenerator.buildResponse(script, "List network interfaces as JSON", ["Read-only operation"], "30s");
  }

  static network_configure(os: OSType, params: Record<string, any>): ScriptResponse {
    const { iface, dhcp, ip, netmask, gateway, dns } = params;
    if (!iface) return ScriptGenerator.buildResponse("", "ERROR: interface name required", [], "0s");

    if (os === "windows") {
      const dhcpCmd = dhcp
        ? `Set-NetIPInterface -InterfaceAlias "${iface}" -Dhcp Enabled`
        : `New-NetIPAddress -InterfaceAlias "${iface}" -IPAddress ${ip} -PrefixLength ${netmask || "24"} ${gateway ? `-DefaultGateway ${gateway}` : ""}`;
      const dnsCmd = dns ? `Set-DnsClientServerAddress -InterfaceAlias "${iface}" -ServerAddresses (${dns.map((d: string) => `"${d}"`).join(",")})` : "";
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
echo "Configuring ${iface}..."
${dhcpCmd}
${dnsCmd}
echo "Interface ${iface} configured"
echo "WARNING: Network changes may disconnect SSH session"
`;
      return ScriptGenerator.buildResponse(script, `Configure interface ${iface}`, ["May disconnect SSH - use with caution"], "2m",
        `${ScriptGenerator.shebang(os)}\n${ScriptGenerator.requireRoot(os)}\nSet-NetIPInterface -InterfaceAlias "${iface}" -Dhcp Enabled\necho "Reverted to DHCP"\n`);
    }
    const dnsLine = dns ? dns.map((d: string) => `echo "nameserver ${d}" >> /etc/resolv.conf`).join("\n") : "";
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
echo "Configuring ${iface}..."
if [ "${dhcp}" = "true" ]; then
  echo "Setting DHCP for ${iface}..."
  # Try netplan first, then ifcfg
  if [ -d /etc/netplan ]; then
    echo "network:\n  version: 2\n  ethernets:\n    ${iface}:\n      dhcp4: true" > /etc/netplan/01-netcfg.yaml
    netplan apply
  elif [ -f /etc/sysconfig/network-scripts/ifcfg-${iface} ]; then
    echo "DEVICE=${iface}\nBOOTPROTO=dhcp\nONBOOT=yes" > /etc/sysconfig/network-scripts/ifcfg-${iface}
    systemctl restart network
  else
    dhclient ${iface}
  fi
else
  ip addr add ${ip}/${netmask || "24"} dev ${iface} 2>/dev/null || true
  ${gateway ? `ip route add default via ${gateway} 2>/dev/null || true` : ""}
fi
${dnsLine}
echo "Interface ${iface} configured"
echo "WARNING: Network changes may disconnect SSH session"
`;
    return ScriptGenerator.buildResponse(script, `Configure interface ${iface}`, ["May disconnect SSH - use with caution"], "2m",
      `${ScriptGenerator.shebang(os)}\n${ScriptGenerator.requireRoot(os)}\ndhclient ${iface}\necho "Reverted to DHCP"\n`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // N02 - Firewall
  // ═══════════════════════════════════════════════════════════════════════

  static firewall_list(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
powershell -Command "$rules = @(Get-NetFirewallRule -Enabled True -ErrorAction SilentlyContinue | Select-Object -First 50 | Select-Object @{Name='id';Expression={$_.InstanceID}}, @{Name='name';Expression={$_.DisplayName}}, @{Name='direction';Expression={[string]$_.Direction}}, @{Name='action';Expression={[string]$_.Action}}); if($rules.Count -gt 0){ $rules | ConvertTo-Json -Compress } else { echo '[]' }"
`;
      return ScriptGenerator.buildResponse(script, "List active firewall rules as JSON", ["Read-only operation"], "30s");
    }
    const script = `${ScriptGenerator.shebang(os)}
# Linux: List iptables rules if available
if command -v iptables &>/dev/null; then
  iptables -L -n 2>/dev/null | awk 'BEGIN{printf "["} /Chain/ {next} /target/ {next} /^$/ {next} {if(p)printf ","; printf "{\\"name\\":\\"%s\\",\\"direction\\":\\"%s\\",\\"action\\":\\"%s\\",\\"id\\":\\"%s\\"}", $1, "IN/OUT", $3, $1; p=1} END{print "]"}'
else
  echo "[]"
fi
`;
    return ScriptGenerator.buildResponse(script, "List firewall rules as JSON", ["Read-only operation"], "30s");
  }

  static firewall_add(os: OSType, params: Record<string, any>): ScriptResponse {
    const { port, protocol, action } = params;
    if (!port) return ScriptGenerator.buildResponse("", "ERROR: port required", [], "0s");
    const proto = protocol || "tcp";
    const act = action || "ACCEPT";

    if (os === "windows") {
      const ruleName = `Saturn_Port_${port}_${proto}`;
      const dir = act === "DROP" ? "Outbound" : "Inbound";
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
New-NetFirewallRule -DisplayName "${ruleName}" -Direction ${dir} -Protocol ${proto} -LocalPort ${port} -Action ${act}
echo "Firewall rule added: ${ruleName}"
`;
      return ScriptGenerator.buildResponse(script, `Add firewall rule for port ${port}/${proto}`, ["Opens/closes firewall port"], "1m",
        `${ScriptGenerator.shebang(os)}\n${ScriptGenerator.requireRoot(os)}\nRemove-NetFirewallRule -DisplayName "${ruleName}"\necho "Rule removed"\n`);
    }
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
if command -v ufw &>/dev/null; then
  ufw ${act === "ACCEPT" ? "allow" : "deny"} ${port}/${proto}
  echo "ufw rule added: ${port}/${proto}"
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --add-port=${port}/${proto} --permanent
  firewall-cmd --reload
  echo "firewalld rule added: ${port}/${proto}"
else
  iptables -A INPUT -p ${proto} --dport ${port} -j ${act}
  echo "iptables rule added: ${port}/${proto}"
fi
`;
    return ScriptGenerator.buildResponse(script, `Add firewall rule for port ${port}/${proto}`, ["Modifies firewall rules"], "1m",
      `${ScriptGenerator.shebang(os)}\n${ScriptGenerator.requireRoot(os)}\niptables -D INPUT -p ${proto} --dport ${port} -j ${act}\necho "Rule removed"\n`);
  }

  static firewall_delete(os: OSType, params: Record<string, any>): ScriptResponse {
    const { ruleId } = params;
    if (!ruleId) return ScriptGenerator.buildResponse("", "ERROR: ruleId required", [], "0s");

    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
Remove-NetFirewallRule -DisplayName "${ruleId}"
echo "Rule ${ruleId} deleted"
`;
      return ScriptGenerator.buildResponse(script, `Delete firewall rule ${ruleId}`, ["Removes firewall rule"], "30s");
    }
    const script = `${ScriptGenerator.shebang(os)}
${ScriptGenerator.requireRoot(os)}
${ScriptGenerator.errorHandler(os)}
iptables -D INPUT ${ruleId} 2>/dev/null && echo "Rule ${ruleId} deleted" || echo "Rule ${ruleId} not found"
`;
    return ScriptGenerator.buildResponse(script, `Delete firewall rule ${ruleId}`, ["Removes iptables rule"], "30s");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // A01 - Packages
  // ═══════════════════════════════════════════════════════════════════════

  static packages_list(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${ScriptGenerator.shebang(os)}
powershell -Command "$pkgs = @(Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object @{Name='name';Expression={$_.DisplayName}}, @{Name='version';Expression={$_.DisplayVersion}}, @{Name='vendor';Expression={$_.Publisher}} | Where-Object { $_.name -ne $null } | Select-Object -First 50); if($pkgs.Count -gt 0){ $pkgs | ConvertTo-Json -Compress } else { echo '[]' }"
`;
      return ScriptGenerator.buildResponse(script, "List installed packages as JSON", ["Read-only operation"], "30s");
    }
    const script = `${this.shebang(os)}
if command -v dpkg-query &>/dev/null; then
  dpkg-query -W -f='\${Package} \${Version} \${Architecture}\\n' | head -n 50 | awk '{printf "{\\"name\\":\\"%s\\",\\"version\\":\\"%s\\",\\"architecture\\":\\"%s\\"},", $1, $2, $3}' | sed 's/,$//' | awk '{print "[" $0 "]"}'
elif command -v rpm &>/dev/null; then
  rpm -qa --qf '{\\"name\\":\\"%{NAME}\\",\\"version\\":\\"%{VERSION}\\",\\"architecture\\":\\"%{ARCH}\\"},' | head -n 50 | sed 's/,$//' | awk '{print "[" $0 "]"}'
else
  echo "[]"
fi
`;
    return ScriptGenerator.buildResponse(script, "List installed packages as JSON", ["Read-only operation"], "30s");
  }

  static packages_install(os: OSType, params: Record<string, any>): ScriptResponse {
    const { packages } = params;
    if (!packages) return this.buildResponse("", "ERROR: packages required", [], "0s");
    const pkgList = Array.isArray(packages) ? packages.join(" ") : packages;

    if (os === "windows") {
      const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
echo "Installing ${pkgList}..."
winget install ${pkgList} --accept-source-agreements --accept-package-agreements 2>nul && echo "Installed via winget" || echo "winget not available, trying chocolatey..."
choco install ${pkgList} -y 2>nul && echo "Installed via chocolatey" || echo "Package manager not available"
`;
      return this.buildResponse(script, `Install packages: ${pkgList}`, ["Installs software packages"], "5m");
    }
    const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
echo "Installing ${pkgList}..."
if command -v apt &>/dev/null; then
  apt-get update -qq && apt-get install -y ${pkgList}
elif command -v dnf &>/dev/null; then
  dnf install -y ${pkgList}
elif command -v yum &>/dev/null; then
  yum install -y ${pkgList}
elif command -v zypper &>/dev/null; then
  zypper install -y ${pkgList}
else
  echo "No known package manager found"
fi
echo "Installation complete"
`;
    return this.buildResponse(script, `Install packages: ${pkgList}`, ["Installs system packages - requires root"], "5m");
  }

  static packages_remove(os: OSType, params: Record<string, any>): ScriptResponse {
    const { packages } = params;
    if (!packages) return this.buildResponse("", "ERROR: packages required", [], "0s");
    const pkgList = Array.isArray(packages) ? packages.join(" ") : packages;

    if (os === "windows") {
      const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
echo "Removing ${pkgList}..."
winget uninstall ${pkgList} --accept-source-agreements 2>nul && echo "Removed via winget" || echo "winget not available"
`;
      return this.buildResponse(script, `Remove packages: ${pkgList}`, ["Removes software packages"], "3m");
    }
    const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
echo "Removing ${pkgList}..."
if command -v apt &>/dev/null; then
  apt-get remove -y ${pkgList}
elif command -v dnf &>/dev/null; then
  dnf remove -y ${pkgList}
elif command -v yum &>/dev/null; then
  yum remove -y ${pkgList}
elif command -v zypper &>/dev/null; then
  zypper remove -y ${pkgList}
else
  echo "No known package manager found"
fi
echo "Removal complete"
`;
    return this.buildResponse(script, `Remove packages: ${pkgList}`, ["Removes system packages"], "3m");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // A02 - Web Servers
  // ═══════════════════════════════════════════════════════════════════════

  static webserver_list(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${this.shebang(os)}
powershell -Command "if(Get-Module -ListAvailable WebAdministration){ $sites = @(Get-Website | Select-Object @{Name='domain';Expression={$_.Name}}, @{Name='root';Expression={$_.PhysicalPath}}, @{Name='state';Expression={$_.State}}, @{Name='type';Expression={'IIS'}}); if($sites.Count -gt 0){ $sites | ConvertTo-Json -Compress } else { echo '[]' } } else { echo '[]' }"
`;
      return this.buildResponse(script, "List IIS sites as JSON", ["Read-only operation"], "30s");
    }
    const script = `${this.shebang(os)}
if [ -d /etc/nginx/sites-enabled ]; then
  ls /etc/nginx/sites-enabled/ | awk '{printf "{\\"domain\\":\\"%s\\",\\"root\\":\\"/etc/nginx/sites-available/%s\\",\\"state\\":\\"Enabled\\",\\"type\\":\\"Nginx\\"},", $1, $1}' | sed 's/,$//' | awk '{print "[" $0 "]"}'
elif [ -d /etc/apache2/sites-enabled ]; then
  ls /etc/apache2/sites-enabled/ | awk '{printf "{\\"domain\\":\\"%s\\",\\"root\\":\\"/etc/apache2/sites-available/%s\\",\\"state\\":\\"Enabled\\",\\"type\\":\\"Apache\\"},", $1, $1}' | sed 's/,$//' | awk '{print "[" $0 "]"}'
else
  echo "[]"
fi
`;
    return this.buildResponse(script, "List web server vhosts as JSON", ["Read-only operation"], "30s");
  }

  static webserver_create(os: OSType, params: Record<string, any>): ScriptResponse {
    const { domain, root, template, ssl } = params;
    if (!domain) return this.buildResponse("", "ERROR: domain required", [], "0s");
    const docRoot = root || `/var/www/${domain}`;
    const sslConfig = ssl ? `\n  listen 443 ssl;\n  ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;\n  ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;` : "";

    if (os === "windows") {
      const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
New-Item -ItemType Directory -Force -Path "${docRoot}"
New-Website -Name "${domain}" -PhysicalPath "${docRoot}" -Port 80 -Force
echo "IIS site ${domain} created"
`;
      return this.buildResponse(script, `Create web site ${domain}`, ["Creates web server configuration"], "2m",
        `${this.shebang(os)}\nRemove-Website -Name "${domain}"\necho "Site ${domain} removed"\n`);
    }
    const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
mkdir -p ${docRoot}
echo "<html><head><title>${domain}</title></head><body><h1>${domain}</h1></body></html>" > ${docRoot}/index.html

# Try Nginx first, then Apache
if command -v nginx &>/dev/null; then
  cat > /etc/nginx/sites-available/${domain} << 'EOF'
server {
  listen 80;
  server_name ${domain};
  root ${docRoot};
  index index.html index.htm;${sslConfig}
}
EOF
  ln -sf /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx || service nginx reload
  echo "Nginx site ${domain} created"
elif command -v apache2 &>/dev/null || command -v httpd &>/dev/null; then
  cat > /etc/apache2/sites-available/${domain}.conf << 'EOF'
<VirtualHost *:80>
  ServerName ${domain}
  DocumentRoot ${docRoot}
  <Directory ${docRoot}>
    AllowOverride All
    Require all granted
  </Directory>
</VirtualHost>
EOF
  a2ensite ${domain}.conf 2>/dev/null || ln -sf /etc/apache2/sites-available/${domain}.conf /etc/apache2/sites-enabled/
  systemctl reload apache2 2>/dev/null || service apache2 reload || systemctl reload httpd 2>/dev/null
  echo "Apache site ${domain} created"
else
  echo "No web server found (install nginx or apache first)"
fi
`;
    return this.buildResponse(script, `Create virtual host ${domain}`, ["Creates web server vhost config"], "2m",
      `${this.shebang(os)}\n${this.requireRoot(os)}\nrm -f /etc/nginx/sites-enabled/${domain} /etc/nginx/sites-available/${domain} /etc/apache2/sites-enabled/${domain}.conf /etc/apache2/sites-available/${domain}.conf\nsystemctl reload nginx 2>/dev/null || systemctl reload apache2 2>/dev/null\necho "Site ${domain} removed"\n`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // H01 - SMART
  // ═══════════════════════════════════════════════════════════════════════

  static smart_info(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${this.shebang(os)}
echo "=== Disk Health ==="
powershell -Command "Get-PhysicalDisk | Select-Object FriendlyName,MediaType,HealthStatus,OperationalStatus,Size | Format-Table -AutoSize"
`;
      return this.buildResponse(script, "Get disk health info (Windows)", ["Read-only operation"], "30s");
    }
    const script = `${this.shebang(os)}
echo "=== SMART Info ==="
for disk in /dev/sd[a-z] /dev/nvme[0-9]n[0-9]; do
  if [ -e "$disk" ]; then
    echo "--- $disk ---"
    smartctl -H $disk 2>/dev/null | grep -E "SMART overall-health|SMART Health Status" || echo "SMART not available for $disk"
    smartctl -A $disk 2>/dev/null | grep -E "Reallocated_Sector|Pending_Sector|Temperature_Celsius|Power_On_Hours" || true
    echo ""
  fi
done
`;
    return this.buildResponse(script, "Get SMART disk health info", ["Read-only operation - requires smartmontools"], "30s");
  }

  static health_info(os: OSType, params: Record<string, any>): ScriptResponse {
    return this.smart_info(os, params);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SEC01 - SSL
  // ═══════════════════════════════════════════════════════════════════════

  static ssl_list(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${this.shebang(os)}
powershell -Command "$certs = @(Get-ChildItem Cert:\\LocalMachine\\My | Select-Object @{Name='subject';Expression={$_.Subject}}, @{Name='issuer';Expression={$_.Issuer}}, @{Name='expires';Expression={$_.NotAfter.ToString()}}, @{Name='thumbprint';Expression={$_.Thumbprint}}); if($certs.Count -gt 0){ $certs | ConvertTo-Json -Compress } else { echo '[]' }"
`;
      return this.buildResponse(script, "List SSL certificates as JSON", ["Read-only operation"], "30s");
    }
    const script = `${this.shebang(os)}
# Linux: List certs from common paths
(
  echo "["
  for cert in /etc/letsencrypt/live/*/fullchain.pem; do
    if [ -f "$cert" ]; then
      domain=$(echo $cert | cut -d/ -f6)
      expires=$(openssl x509 -in $cert -noout -enddate | cut -d= -f2)
      issuer=$(openssl x509 -in $cert -noout -issuer | cut -d= -f2-)
      printf "{\\"subject\\":\\"%s\\",\\"issuer\\":\\"%s\\",\\"expires\\":\\"%s\\",\\"thumbprint\\":\\"N/A\\"}," "$domain" "$issuer" "$expires"
    fi
  done
  echo "null]"
) | sed 's/,null/ /g' | sed 's/null//g'
`;
    return this.buildResponse(script, "List SSL certificates as JSON", ["Read-only operation"], "30s");
  }

  static ssl_renew(os: OSType, params: Record<string, any>): ScriptResponse {
    const { domain } = params;
    if (!domain) return this.buildResponse("", "ERROR: domain required", [], "0s");

    if (os === "windows") {
      const script = `${this.shebang(os)}
echo "SSL renewal for ${domain} not automated on Windows"
echo "Use certbot manually or ACME PowerShell scripts"
`;
      return this.buildResponse(script, `Renew SSL for ${domain}`, ["Manual process on Windows"], "5m");
    }
    const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
if command -v certbot &>/dev/null; then
  certbot renew --cert-name ${domain} --non-interactive --agree-tos
  echo "Certificate for ${domain} renewed"
  # Reload web servers
  systemctl reload nginx 2>/dev/null || systemctl reload apache2 2>/dev/null || service nginx reload 2>/dev/null || service apache2 reload 2>/dev/null || true
else
  echo "certbot not installed. Install with: apt-get install certbot"
fi
`;
    return this.buildResponse(script, `Renew SSL certificate for ${domain}`, ["Requires certbot and port 80/443 access"], "3m");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // B01 - Backups
  // ═══════════════════════════════════════════════════════════════════════

  static backups_list(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${this.shebang(os)}
echo "=== Backup Locations ==="
for dir in "C:\\Backups" "C:\\WindowsBackup"; do
  if [ -d "$dir" ]; then
    echo "--- $dir ---"
    dir "$dir" /b 2>nul | head -20
    echo ""
  fi
done
`;
      return this.buildResponse(script, "List backup files", ["Read-only operation"], "30s");
    }
    const script = `${this.shebang(os)}
echo "=== Backup Locations ==="
for dir in /backup /var/backups /opt/backup; do
  if [ -d "$dir" ]; then
    echo "--- $dir ---"
    ls -lh "$dir" 2>/dev/null | head -20
    echo ""
  fi
done
`;
    return this.buildResponse(script, "List backup files", ["Read-only operation"], "30s");
  }

  static backups_create(os: OSType, params: Record<string, any>): ScriptResponse {
    const { path: sourcePath, schedule, retention } = params;
    if (!sourcePath) return this.buildResponse("", "ERROR: path required", [], "0s");
    const ret = retention || "7";
    const backupDir = "/backup";
    const timestamp = "$(date +%Y%m%d_%H%M%S)";

    if (os === "windows") {
      const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
$backupDir = "C:\\Backups"
$source = "${sourcePath}"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dest = "$backupDir\\backup_$timestamp.zip"
New-Item -ItemType Directory -Force -Path $backupDir
Compress-Archive -Path $source -DestinationPath $dest
echo "Backup created: $dest"
# Cleanup old backups (retention: ${ret} days)
Get-ChildItem $backupDir -Filter "*.zip" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-${ret}) } | Remove-Item -Force
echo "Old backups cleaned (retention: ${ret} days)"
`;
      return this.buildResponse(script, `Create backup of ${sourcePath}`, ["Creates compressed backup"], "varies",
        `${this.shebang(os)}\necho "Manual restore required: extract the zip file"\n`);
    }
    const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
BACKUP_DIR="${backupDir}"
SOURCE="${sourcePath}"
TIMESTAMP=${timestamp}
DEST="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
mkdir -p "$BACKUP_DIR"
tar -czf "$DEST" "$SOURCE" 2>/dev/null
echo "Backup created: $DEST ($(du -h "$DEST" | cut -f1))"
# Cleanup old backups (retention: ${ret} days)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +${ret} -delete
echo "Old backups cleaned (retention: ${ret} days)"
`;
    return this.buildResponse(script, `Create backup of ${sourcePath}`, ["Creates tar.gz backup"], "varies",
      `${this.shebang(os)}\necho "Restore: tar -xzf BACKUP_FILE -C /"\n`);
  }

  static backups_run(os: OSType, params: Record<string, any>): ScriptResponse {
    const { backupId } = params;
    if (!backupId) return this.buildResponse("", "ERROR: backupId required", [], "0s");

    const script = `${this.shebang(os)}
echo "Running backup job: ${backupId}"
# Execute the backup script associated with this job
if [ -f "/opt/saturn/backups/${backupId}.sh" ]; then
  bash "/opt/saturn/backups/${backupId}.sh"
  echo "Backup ${backupId} completed"
else
  echo "Backup script not found for ${backupId}"
fi
`;
    return this.buildResponse(script, `Run backup job ${backupId}`, ["Executes backup script"], "varies");
  }
  // ═══════════════════════════════════════════════════════════════════════
  // SEC02 - Security Hardening
  // ═══════════════════════════════════════════════════════════════════════

  static security_audit(os: OSType, params: Record<string, any>): ScriptResponse {
    if (os === "windows") {
      const script = `${this.shebang(os)}
echo "=== Open Ports ==="
netstat -ano | findstr LISTENING | head -20
echo ""
echo "=== Failed Logins (last 10) ==="
powershell -Command "Get-WinEvent -LogName Security -FilterXPath \"*[System[(EventID=4625)]]\" -MaxEvents 10 | Select-Object TimeCreated,@{n='User';e={$_.Properties[5].Value}},@{n='IP';e={$_.Properties[18].Value}} | Format-Table -AutoSize"
`;
      return this.buildResponse(script, "Security audit: open ports and failed logins", ["Read-only operation"], "1m");
    }
    const script = `${this.shebang(os)}
echo "=== Open Ports ==="
ss -tulpn | grep LISTEN | head -20
echo ""
echo "=== Failed SSH Logins (last 10) ==="
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -10 || journalctl _SYSTEMD_UNIT=ssh.service | grep "Failed password" | tail -10 || echo "(no failed logins found)"
echo ""
echo "=== Root Login Status ==="
grep "^PermitRootLogin" /etc/ssh/sshd_config || echo "PermitRootLogin default (check config)"
`;
    return this.buildResponse(script, "Security audit: ports, logins and SSH config", ["Read-only operation"], "1m");
  }

  static security_hardening(os: OSType, params: Record<string, any>): ScriptResponse {
    const { disableRoot, changeSSHPort } = params;
    
    if (os === "windows") {
      const script = `${this.shebang(os)}
${this.requireRoot(os)}
echo "Windows hardening not fully automated. Recommendations:"
echo "- Disable SMBv1"
echo "- Enable Windows Defender"
echo "- Set Password Complexity Policies"
`;
      return this.buildResponse(script, "Basic Windows Hardening", ["Informational only"], "1m");
    }

    const portCmd = changeSSHPort ? `sed -i 's/^#Port 22/Port ${changeSSHPort}/' /etc/ssh/sshd_config && sed -i 's/^Port 22/Port ${changeSSHPort}/' /etc/ssh/sshd_config` : "";
    const rootCmd = disableRoot ? `sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config` : "";
    
    const script = `${this.shebang(os)}
${this.requireRoot(os)}
${this.errorHandler(os)}
echo "Hardening SSH configuration..."
${portCmd}
${rootCmd}
echo "Restarting SSH service..."
systemctl restart ssh || service ssh restart
echo "Hardening complete"
echo "WARNING: If you changed the port, update Saturn connection settings!"
`;
    return this.buildResponse(script, "SSH Hardening (Disable Root/Change Port)", ["Risk of lockout - verify new settings before disconnecting"], "2m");
  }
}
