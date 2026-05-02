import { NodeSSH } from "node-ssh";
import os from "os";
import path from "path";
import { OSType } from "./types.js";

export interface SSHConnectionConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  passphrase?: string;
  readyTimeout?: number;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  os: string;
  hostname: string;
  kernel: string;
  processes: number;
  loadAvg: number[];
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

// ── Safe Parsing Functions ───────────────────────────────────────────────────
function safeParseFloat(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const parsed = parseFloat(val.toString());
  return isNaN(parsed) ? 0 : parsed;
}

function safeParseInt(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const parsed = parseInt(val.toString());
  return isNaN(parsed) ? 0 : parsed;
}

export class SSHAgent {
  private connections: Map<string, NodeSSH> = new Map();

  private getKey(host: string, port: number, username: string): string {
    return `${username}@${host}:${port}`;
  }

  async connect(config: SSHConnectionConfig): Promise<string> {
    const key = this.getKey(config.host, config.port, config.username);
    const conn = new NodeSSH();

    const connectConfig: any = {
      host: config.host,
      port: config.port,
      username: config.username,
      readyTimeout: config.readyTimeout || 10000,
      tryKeyboard: true,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
    };

    if (config.privateKey) {
      connectConfig.privateKey = config.privateKey;
      if (config.passphrase) connectConfig.passphrase = config.passphrase;
    } else if (config.password) {
      connectConfig.password = config.password;
    }

    try {
      await conn.connect(connectConfig);
      this.connections.set(key, conn);
      return key;
    } catch (error: any) {
      throw new Error(`SSH connection failed to ${key}: ${error.message}`);
    }
  }

  async execCommand(connKey: string, command: string, timeoutMs: number = 30000): Promise<ExecResult> {
    const conn = this.connections.get(connKey);
    if (!conn) throw new Error(`No connection found: ${connKey}`);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Command timed out after ${timeoutMs}ms`)), timeoutMs)
      );
      const execPromise = conn.execCommand(command, {});
      
      const result = await Promise.race([execPromise, timeoutPromise]) as any;
      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        code: result.code,
      };
    } catch (error: any) {
      throw new Error(`Command execution failed: ${error.message}`);
    }
  }

  async getSystemMetrics(connKey: string, osType?: OSType): Promise<SystemMetrics> {
    const conn = this.connections.get(connKey);
    if (!conn) throw new Error(`No connection found: ${connKey}`);

    try {
      // Determine OS if not provided
      let actualOs = osType;
      if (!actualOs) {
        const checkOs = await conn.execCommand("uname -s", {});
        actualOs = checkOs.stdout.toLowerCase().includes("linux") ? "linux" : "windows";
      }

      if (actualOs === "windows") {
        const psScript = `$c=Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"|Select-Object -ExpandProperty PercentProcessorTime; $o=Get-CimInstance Win32_OperatingSystem; $tr=$o.TotalVisibleMemorySize; $fr=$o.FreePhysicalMemory; $rp=(($tr-$fr)/$tr)*100; $d=Get-PSDrive C; $dp=(($d.Used)/($d.Used+$d.Free))*100; $ut=(Get-Date)-$o.LastBootUpTime; Write-Host "$c;$rp;$dp;$($ut.TotalSeconds)"`;
        const res = await conn.execCommand(`powershell -Command "${psScript}"`, {});
        const parts = res.stdout.trim().split(';');
        const cpu = safeParseFloat(parts[0]);
        const memory = safeParseFloat(parts[1]);
        const disk = safeParseFloat(parts[2]);
        const uptime = safeParseInt(parts[3]);

        const osRes = await conn.execCommand('powershell -Command "(Get-CimInstance Win32_OperatingSystem).Caption"', {});
        const os = osRes.stdout.trim() || "Windows";
        const hostRes = await conn.execCommand("hostname", {});
        const hostname = hostRes.stdout.trim();
        const kernelRes = await conn.execCommand('powershell -Command "(Get-CimInstance Win32_OperatingSystem).Version"', {});
        const kernel = kernelRes.stdout.trim();
        const procsRes = await conn.execCommand('powershell -Command "(Get-Process).Count"', {});
        const processes = safeParseInt(procsRes.stdout);

        return { cpu, memory, disk, uptime, os, hostname, kernel, processes, loadAvg: [0, 0, 0] };
      }

      // Linux
      const bashScript = `c=$(top -bn1 | grep '%Cpu' | awk '{print 100 - $8}'); mt=$(grep MemTotal /proc/meminfo | awk '{print $2}'); ma=$(grep MemAvailable /proc/meminfo | awk '{print $2}'); rp=$(awk "BEGIN {print ($mt - $ma) / $mt * 100}"); dp=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%'); us=$(awk '{print int($1)}' /proc/uptime); echo "$c;$rp;$dp;$us"`;
      const result = await conn.execCommand(bashScript, {});
      const parts = result.stdout.trim().split(';');
      const cpu = safeParseFloat(parts[0]);
      const memory = safeParseFloat(parts[1]);
      const disk = safeParseFloat(parts[2]);
      const uptime = safeParseInt(parts[3]);

      // OS
      const osResult = await conn.execCommand(
        `cat /etc/os-release 2>/dev/null | grep "^PRETTY_NAME" | cut -d'"' -f2 || echo "linux"`,
        {}
      );
      const os = osResult.stdout.trim() || "linux";

      // Hostname
      const hostnameResult = await conn.execCommand(`hostname`, {});
      const hostname = hostnameResult.stdout.trim() || "unknown";

      // Kernel
      const kernelResult = await conn.execCommand(`uname -r`, {});
      const kernel = kernelResult.stdout.trim() || "unknown";

      // Processes
      const procsResult = await conn.execCommand(`ps aux 2>/dev/null | wc -l || echo 0`, {});
      const processes = safeParseInt(procsResult.stdout);

      // Load averages
      const loadResult = await conn.execCommand(
        `cat /proc/loadavg | awk '{print $1, $2, $3}'`,
        {}
      );
      const loadAvg = loadResult.stdout
        .trim()
        .split(" ")
        .map((v: string) => safeParseFloat(v));

      return { cpu, memory, disk, uptime, os, hostname, kernel, processes, loadAvg };
    } catch (error: any) {
      throw new Error(`Failed to get system metrics: ${error.message}`);
    }
  }

  async execScript(connKey: string, script: string): Promise<ExecResult> {
    // Write script to temp file via putFile, execute, then remove
    const tmpFile = `/tmp/saturno_script_${Date.now()}.sh`;
    const tmpLocal = path.join(os.tmpdir(), `saturno_script_${Date.now()}.sh`);

    try {
      const fs = await import("fs");
      fs.writeFileSync(tmpLocal, script, "utf-8");
      
      const conn = this.connections.get(connKey);
      if (!conn) throw new Error(`No connection found: ${connKey}`);

      await conn.putFile(tmpLocal, tmpFile);
      await conn.execCommand(`chmod +x ${tmpFile}`, {});
      const result = await conn.execCommand(`bash ${tmpFile}`, {});
      await conn.execCommand(`rm -f ${tmpFile}`, {});
      fs.unlinkSync(tmpLocal);
      
      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        code: result.code,
      };
    } catch (error: any) {
      return { stdout: "", stderr: `Script execution failed: ${error.message}`, code: -1 };
    }
  }

  async testConnection(config: SSHConnectionConfig): Promise<{ success: boolean; message: string; metrics?: SystemMetrics }> {
    let key: string | null = null;
    try {
      key = await this.connect(config);
      const metrics = await this.getSystemMetrics(key);
      return { success: true, message: `Connected to ${config.host}`, metrics };
    } catch (error: any) {
      return { success: false, message: error.message };
    } finally {
      if (key) await this.disconnect(key);
    }
  }

  async disconnect(connKey: string): Promise<void> {
    const conn = this.connections.get(connKey);
    if (conn) {
      conn.dispose();
      this.connections.delete(connKey);
    }
  }

  disconnectAll(): void {
    for (const [key, conn] of this.connections) {
      conn.dispose();
    }
    this.connections.clear();
  }
}

export const sshAgent = new SSHAgent();
