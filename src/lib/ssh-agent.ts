import { NodeSSH } from "node-ssh";
import os from "os";
import path from "path";

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

  async execCommand(connKey: string, command: string): Promise<ExecResult> {
    const conn = this.connections.get(connKey);
    if (!conn) throw new Error(`No connection found: ${connKey}`);

    try {
      const result = await conn.execCommand(command, {});
      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        code: result.code,
      };
    } catch (error: any) {
      throw new Error(`Command execution failed: ${error.message}`);
    }
  }

  async getSystemMetrics(connKey: string): Promise<SystemMetrics> {
    const conn = this.connections.get(connKey);
    if (!conn) throw new Error(`No connection found: ${connKey}`);

    try {
      // CPU - using /proc/stat for accuracy
      const cpuResult = await conn.execCommand(
        `awk '{u=$2+$4; t=$2+$4+$5; if (NR==1) {u1=u; t1=t} else {printf "%.1f", (($2+$4)-u1)*100/(t-t1)}}' <(grep 'cpu ' /proc/stat) <(sleep 1; grep 'cpu ' /proc/stat)`,
        {}
      );
      const cpu = cpuResult.stdout ? parseFloat(cpuResult.stdout.trim()) || 0 : 0;

      // Memory
      const memResult = await conn.execCommand(
        `free | grep Mem | awk '{printf "%.1f", $3/$2 * 100}'`,
        {}
      );
      const memory = parseFloat(memResult.stdout) || 0;

      // Disk
      const diskResult = await conn.execCommand(
        `df / | tail -1 | awk '{print $5}' | sed 's/%//'`,
        {}
      );
      const disk = parseFloat(diskResult.stdout) || 0;

      // Uptime (seconds)
      const uptimeResult = await conn.execCommand(
        `cat /proc/uptime | awk '{print int($1)}'`,
        {}
      );
      const uptime = parseInt(uptimeResult.stdout) || 0;

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
      const processes = parseInt(procsResult.stdout) || 0;

      // Load averages
      const loadResult = await conn.execCommand(
        `cat /proc/loadavg | awk '{print $1, $2, $3}'`,
        {}
      );
      const loadAvg = loadResult.stdout
        .trim()
        .split(" ")
        .map((v: string) => parseFloat(v) || 0);

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
    try {
      const key = await this.connect(config);
      const metrics = await this.getSystemMetrics(key);
      await this.disconnect(key);
      return { success: true, message: `Connected to ${config.host}`, metrics };
    } catch (error: any) {
      return { success: false, message: error.message };
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
