import { Router } from "express";
import type Database from "better-sqlite3";
import type { SSHAgent, ExecResult } from "./ssh-agent.js";
import type {
  ScriptRequest,
  ScriptResponse,
  OSType,
} from "./types.js";

// ── Helper: get SSH connection key from serverId
function getSshConnection(db: Database.Database, serverId: string): { conn: any; key: string } {
  const conn = db
    .prepare("SELECT * FROM ssh_connections WHERE serverId = ?")
    .get(serverId) as any;
  if (!conn) throw new Error(`No SSH connection found for server ${serverId}`);
  const key = `${conn.username}@${conn.host}:${conn.port}`;
  return { conn, key };
}

// ── Helper: ensure SSH is connected, reconnect if needed
async function ensureConnected(
  db: Database.Database,
  sshAgent: SSHAgent,
  serverId: string
): Promise<string> {
  const { conn, key } = getSshConnection(db, serverId);
  try {
    await sshAgent.getSystemMetrics(key);
  } catch {
    const config: any = {
      host: conn.host,
      port: conn.port,
      username: conn.username,
    };
    if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
    if (conn.encryptedPassword) config.password = decrypt(conn.encryptedPassword);
    await sshAgent.connect(config);
  }
  return key;
}

// ── Helper: extract JSON from string with noise
function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        throw new Error(`Failed to parse extracted JSON: ${e.message}`);
      }
    }
    throw new Error("No JSON block found in output");
  }
}

// ── Helper: audit log entry
function auditLog(
  db: Database.Database,
  type: string,
  event: string,
  detail: string
): void {
  db.prepare(
    "INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)"
  ).run(
    `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    event,
    detail,
    new Date().toISOString()
  );
}

// ── Helper: wrap handler with try/catch
function wrapHandler(
  fn: (req: any, res: any) => Promise<void>
): (req: any, res: any) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

// ── Helper: get OS type from server record
function getServerOs(db: Database.Database, serverId: string): OSType {
  const server = db.prepare("SELECT os FROM servers WHERE id = ?").get(serverId) as any;
  if (!server) throw new Error(`Server ${serverId} not found`);
  return server.os === "windows" ? "windows" : "linux";
}

// ── Helper: build ScriptRequest
function buildRequest(
  category: string,
  action: string,
  os: OSType,
  params: Record<string, any> = {},
  dryRun = false
): ScriptRequest {
  return { category, action, os, params, dryRun };
}

// ── Helper: exec command via SSH
async function execOnServer(
  db: Database.Database,
  sshAgent: SSHAgent,
  serverId: string,
  command: string
): Promise<ExecResult> {
  const key = await ensureConnected(db, sshAgent, serverId);
  return sshAgent.execCommand(key, command);
}

// ── Helper: exec script via SSH
async function execScriptOnServer(
  db: Database.Database,
  sshAgent: SSHAgent,
  serverId: string,
  script: string
): Promise<ExecResult> {
  const key = await ensureConnected(db, sshAgent, serverId);
  return sshAgent.execScript(key, script);
}

// ===== createAdminRouter =====
export function createAdminRouter(
  db: Database.Database,
  sshAgent: SSHAgent,
  scriptGenerator: {
    generate: (req: ScriptRequest) => ScriptResponse;
  },
  decrypt: (text: string) => string
): Router {
  const router = Router();

  // ---- S01 - Users ----

  // GET /api/admin/servers/:serverId/users
  router.get(
    "/api/admin/servers/:serverId/users",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("users", "list", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "USER", "USERS_LISTED", `Listed users on ${serverId}`);
      
      if (result.code !== 0) {
        console.error("Users list script failed:", result.stderr);
        throw new Error(`Script failed with code ${result.code}: ${result.stderr}`);
      }

      let users = [];
      try {
        users = extractJson(result.stdout);
      } catch (e) {
        console.error("Failed to parse users JSON. Raw output:", result.stdout);
        throw new Error(`Invalid JSON output from users script: ${result.stdout.substring(0, 200)}`);
      }
      res.json({ success: true, users, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/users
  router.post(
    "/api/admin/servers/:serverId/users",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { username, password, groups, shell, homeDir } = req.body;
      if (!username) { res.status(400).json({ error: "username is required" }); return; }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("users", "create", os, { username, password, groups, shell, homeDir }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "USER", "USER_CREATED", `Created user ${username} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // DELETE /api/admin/servers/:serverId/users/:username
  router.delete(
    "/api/admin/servers/:serverId/users/:username",
    wrapHandler(async (req, res) => {
      const { serverId, username } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("users", "delete", os, { username }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "USER", "USER_DELETED", `Deleted user ${username} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/users/:username/lock
  router.post(
    "/api/admin/servers/:serverId/users/:username/lock",
    wrapHandler(async (req, res) => {
      const { serverId, username } = req.params;
      const { locked } = req.body;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("users", "lock", os, { username, locked: !!locked }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      const action = locked ? "Locked" : "Unlocked";
      auditLog(db, "USER", "USER_LOCK_TOGGLED", `${action} user ${username} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/users/:username/groups
  router.post(
    "/api/admin/servers/:serverId/users/:username/groups",
    wrapHandler(async (req, res) => {
      const { serverId, username } = req.params;
      const { groups, action } = req.body;
      if (!groups || !Array.isArray(groups) || !action) {
        res.status(400).json({ error: "groups (array) and action (add or remove) required" });
        return;
      }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("users", "groups", os, { username, groups, groupAction: action }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      if (result.code !== 0) throw new Error(`Script failed: ${result.stderr} | Output: ${result.stdout}`);
      auditLog(db, "USER", "USER_GROUPS_MODIFIED", `${action} groups ${groups.join(",")} for ${username} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- S02 - Tasks ----

  // GET /api/admin/servers/:serverId/tasks
  router.get(
    "/api/admin/servers/:serverId/tasks",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("tasks", "list", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "TASK", "TASKS_LISTED", `Listed tasks on ${serverId}`);
      let tasks = [];
      try {
        tasks = extractJson(result.stdout);
      } catch (e) {
        console.error("Failed to parse tasks JSON. Raw output:", result.stdout);
        throw new Error(`Invalid JSON output from tasks script: ${result.stdout.substring(0, 200)}`);
      }
      res.json({ success: true, tasks, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/tasks
  router.post(
    "/api/admin/servers/:serverId/tasks",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { schedule, command, name } = req.body;
      if (!schedule || !command) {
        res.status(400).json({ error: "schedule and command are required" });
        return;
      }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("tasks", "create", os, { schedule, command, name }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "TASK", "TASK_CREATED", `Created task ${name || command} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // DELETE /api/admin/servers/:serverId/tasks/:taskId
  router.delete(
    "/api/admin/servers/:serverId/tasks/:taskId",
    wrapHandler(async (req, res) => {
      const { serverId, taskId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("tasks", "delete", os, { taskId }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "TASK", "TASK_DELETED", `Deleted task ${taskId} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- S03 - Processes ----

  // GET /api/admin/servers/:serverId/processes
  router.get(
    "/api/admin/servers/:serverId/processes",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("processes", "list", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "PROCESS", "PROCESSES_LISTED", `Listed processes on ${serverId}`);
      let processes = [];
      try {
        processes = extractJson(result.stdout);
      } catch (e) {
        console.error("Failed to parse processes JSON:", result.stdout);
      }
      res.json({ success: true, processes, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/processes/:pid/kill
  router.post(
    "/api/admin/servers/:serverId/processes/:pid/kill",
    wrapHandler(async (req, res) => {
      const { serverId, pid } = req.params;
      const { signal } = req.body;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("processes", "kill", os, { pid, signal: signal || "SIGTERM" }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "PROCESS", "PROCESS_KILLED", `Killed process ${pid} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/processes/:pid/renice
  router.post(
    "/api/admin/servers/:serverId/processes/:pid/renice",
    wrapHandler(async (req, res) => {
      const { serverId, pid } = req.params;
      const { priority } = req.body;
      if (priority === undefined) { res.status(400).json({ error: "priority is required" }); return; }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("processes", "renice", os, { pid, priority }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "PROCESS", "PROCESS_RENICED", `Reniced process ${pid} to ${priority} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- S04 - Monitoring ----

  // GET /api/admin/servers/:serverId/monitoring
  router.get(
    "/api/admin/servers/:serverId/monitoring",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("monitoring", "snapshot", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "MONITOR", "MONITORING_SNAPSHOT", `Took monitoring snapshot on ${serverId}`);
      
      let snapshot: any = {};
      try {
        // Monitoring snapshot might be a mix of text and values, but our script-generator for snapshot returns text
        // However, we want it to be JSON for the UI
        if (result.stdout.trim().startsWith("{")) {
          snapshot = extractJson(result.stdout);
        } else {
          // Fallback parsing for text output
          const cpuMatch = result.stdout.match(/CPU: ([\d.]+)%/);
          const memMatch = result.stdout.match(/Memory: ([\d.]+)%/);
          const diskMatch = result.stdout.match(/Disk: ([\d.]+)%/);
          snapshot = {
            cpu: cpuMatch ? parseFloat(cpuMatch[1]) : 0,
            memory: memMatch ? parseFloat(memMatch[1]) : 0,
            disk: diskMatch ? parseFloat(diskMatch[1]) : 0,
            raw: result.stdout
          };
        }
      } catch (e) {
        console.error("Failed to parse monitoring snapshot:", e);
      }
      res.json({ success: true, snapshot, raw: result });
    })
  );

  // GET /api/admin/servers/:serverId/monitoring/history
  router.get(
    "/api/admin/servers/:serverId/monitoring/history",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const rows = db.prepare(
        "SELECT * FROM monitoring_history WHERE serverId = ? ORDER BY timestamp DESC LIMIT 100"
      ).all(serverId);
      res.json({ success: true, data: rows });
    })
  );

  // ---- S05 - Logs ----

  // GET /api/admin/servers/:serverId/logs
  router.get(
    "/api/admin/servers/:serverId/logs",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { lines: logLines, service } = req.query;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("logs", "get", os, { lines: logLines || "50", service }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "LOG", "LOGS_FETCHED", `Fetched logs on ${serverId}`);
      
      const lines = result.stdout.split("\n").filter(l => l.trim() !== "");
      const logs = lines.map(line => ({
        timestamp: line.substring(0, 16),
        message: line,
        level: line.toLowerCase().includes("error") ? "Error" : line.toLowerCase().includes("warn") ? "Warning" : "Info"
      }));

      res.json({ success: true, logs, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/logs/rotate
  router.post(
    "/api/admin/servers/:serverId/logs/rotate",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { service } = req.body;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("logs", "rotate", os, { service }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "LOG", "LOGS_ROTATED", `Rotated logs on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- N01 - Network ----

  // GET /api/admin/servers/:serverId/network
  router.get(
    "/api/admin/servers/:serverId/network",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("network", "list", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "NETWORK", "NETWORK_INTERFACES_LISTED", `Listed network interfaces on ${serverId}`);
      let network = [];
      try {
        network = extractJson(result.stdout);
      } catch (e) {
        console.error("Failed to parse network JSON:", result.stdout);
      }
      res.json({ success: true, network, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/network/:iface
  router.post(
    "/api/admin/servers/:serverId/network/:iface",
    wrapHandler(async (req, res) => {
      const { serverId, iface } = req.params;
      const { dhcp, ip, netmask, gateway, dns } = req.body;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("network", "configure", os, { iface, dhcp, ip, netmask, gateway, dns }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "NETWORK", "NETWORK_INTERFACE_CONFIGURED", `Configured interface ${iface} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- N02 - Firewall ----

  // GET /api/admin/servers/:serverId/firewall
  router.get(
    "/api/admin/servers/:serverId/firewall",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("firewall", "list", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "FIREWALL", "FIREWALL_RULES_LISTED", `Listed firewall rules on ${serverId}`);
      let firewall = [];
      try {
        firewall = extractJson(result.stdout);
      } catch (e) {
        console.error("Failed to parse firewall JSON. Raw output:", result.stdout);
        throw new Error(`Invalid JSON output from firewall script: ${result.stdout.substring(0, 200)}`);
      }
      res.json({ success: true, firewall, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/firewall
  router.post(
    "/api/admin/servers/:serverId/firewall",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { rule, port, protocol, action } = req.body;
      if (!rule && !port) {
        res.status(400).json({ error: "rule or port is required" });
        return;
      }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("firewall", "add", os, { rule, port, protocol, action }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "FIREWALL", "FIREWALL_RULE_ADDED", `Added firewall rule on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // DELETE /api/admin/servers/:serverId/firewall/:ruleId
  router.delete(
    "/api/admin/servers/:serverId/firewall/:ruleId",
    wrapHandler(async (req, res) => {
      const { serverId, ruleId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("firewall", "delete", os, { ruleId }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "FIREWALL", "FIREWALL_RULE_DELETED", `Deleted firewall rule ${ruleId} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- A01 - Packages ----

  // GET /api/admin/servers/:serverId/packages
  router.get(
    "/api/admin/servers/:serverId/packages",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("packages", "list", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "PACKAGE", "PACKAGES_LISTED", `Listed packages on ${serverId}`);
      
      let packages = [];
      try {
        if (result.stdout.trim().startsWith("[")) {
          packages = extractJson(result.stdout);
        } else {
          packages = result.stdout.split("\n").filter(l => l.trim() !== "").map(l => ({ name: l, version: "N/A" }));
        }
      } catch (e) { packages = []; }

      res.json({ success: true, packages, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/packages/install
  router.post(
    "/api/admin/servers/:serverId/packages/install",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { packages } = req.body;
      if (!packages) { res.status(400).json({ error: "packages is required" }); return; }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("packages", "install", os, { packages }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "PACKAGE", "PACKAGES_INSTALLED", `Installed packages on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/packages/remove
  router.post(
    "/api/admin/servers/:serverId/packages/remove",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { packages } = req.body;
      if (!packages) { res.status(400).json({ error: "packages is required" }); return; }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("packages", "remove", os, { packages }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "PACKAGE", "PACKAGES_REMOVED", `Removed packages on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- A02 - Web Servers ----

  // GET /api/admin/servers/:serverId/webserver
  router.get(
    "/api/admin/servers/:serverId/webserver",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("webserver", "list", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "WEBSERVER", "VHOSTS_LISTED", `Listed virtual hosts on ${serverId}`);
      
      let sites = [];
      try {
        if (result.stdout.trim().startsWith("[")) {
          sites = extractJson(result.stdout);
        } else {
          sites = result.stdout.split("\n").filter(l => l.trim() !== "").map(l => ({ domain: l, root: "N/A", state: "Unknown" }));
        }
      } catch (e) { sites = []; }

      res.json({ success: true, sites, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/webserver
  router.post(
    "/api/admin/servers/:serverId/webserver",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { domain, root, template, ssl } = req.body;
      if (!domain) { res.status(400).json({ error: "domain is required" }); return; }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("webserver", "create", os, { domain, root, template, ssl }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "WEBSERVER", "VHOST_CREATED", `Created vhost ${domain} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- H01 - SMART ----

  // GET /api/admin/servers/:serverId/smart
  router.get(
    "/api/admin/servers/:serverId/smart",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("smart", "info", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "SMART", "SMART_INFO_FETCHED", `Fetched SMART info on ${serverId}`);
      
      let disks = [];
      try {
        if (result.stdout.trim().startsWith("[")) {
          disks = extractJson(result.stdout);
        } else {
          disks = [{ name: "Main Drive", health: "Unknown", type: "N/A", size: "N/A", raw: result.stdout }];
        }
      } catch (e) { disks = []; }

      res.json({ success: true, disks, raw: result });
    })
  );

  // ---- SEC01 - SSL ----

  // GET /api/admin/servers/:serverId/ssl
  router.get(
    "/api/admin/servers/:serverId/ssl",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("ssl", "list", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "SSL", "SSL_CERTS_LISTED", `Listed SSL certs on ${serverId}`);
      
      let certificates = [];
      try {
        if (result.stdout.trim().startsWith("[")) {
          certificates = extractJson(result.stdout);
        } else {
          certificates = [];
        }
      } catch (e) { certificates = []; }

      res.json({ success: true, certificates, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/ssl/renew
  router.post(
    "/api/admin/servers/:serverId/ssl/renew",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { domain } = req.body;
      if (!domain) { res.status(400).json({ error: "domain is required" }); return; }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("ssl", "renew", os, { domain }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "SSL", "SSL_CERT_RENEWED", `Renewed SSL cert for ${domain} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- B01 - Backups ----

  // GET /api/admin/servers/:serverId/backups
  router.get(
    "/api/admin/servers/:serverId/backups",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("backups", "list", os));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "BACKUP", "BACKUPS_LISTED", `Listed backups on ${serverId}`);
      
      let backups = [];
      try {
        if (result.stdout.trim().startsWith("[")) {
          backups = extractJson(result.stdout);
        } else {
          backups = result.stdout.split("\n").filter(l => l.trim() !== "").map(l => ({ name: l, size: "N/A", date: "N/A" }));
        }
      } catch (e) { backups = []; }

      res.json({ success: true, backups, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/backups
  router.post(
    "/api/admin/servers/:serverId/backups",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { path, schedule, retention } = req.body;
      if (!path) { res.status(400).json({ error: "path is required" }); return; }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("backups", "create", os, { path, schedule, retention }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "BACKUP", "BACKUP_JOB_CREATED", `Created backup job for ${path} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // POST /api/admin/servers/:serverId/backups/:backupId/run
  router.post(
    "/api/admin/servers/:serverId/backups/:backupId/run",
    wrapHandler(async (req, res) => {
      const { serverId, backupId } = req.params;
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest("backups", "run", os, { backupId }));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "BACKUP", "BACKUP_RUN", `Ran backup ${backupId} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result });
    })
  );

  // ---- Script Generator ----

  // POST /api/admin/script/generate
  router.post(
    "/api/admin/script/generate",
    wrapHandler(async (req, res) => {
      const { category, action, os, params } = req.body;
      if (!category || !action || !os) {
        res.status(400).json({ error: "category, action and os are required" });
        return;
      }
      const sr = scriptGenerator.generate(buildRequest(category, action, os, params, true));
      res.json({ success: true, script: sr.script, preview: sr.preview });
    })
  );

  // POST /api/admin/servers/:serverId/script/execute
  router.post(
    "/api/admin/servers/:serverId/script/execute",
    wrapHandler(async (req, res) => {
      const { serverId } = req.params;
      const { category, action, params } = req.body;
      if (!category || !action) {
        res.status(400).json({ error: "category and action are required" });
        return;
      }
      const os = getServerOs(db, serverId);
      const sr = scriptGenerator.generate(buildRequest(category, action, os, params));
      const result = await execOnServer(db, sshAgent, serverId, sr.script);
      auditLog(db, "SCRIPT", "SCRIPT_EXECUTED", `Executed ${category}/${action} on ${serverId}`);
      res.json({ success: true, data: result.stdout, raw: result, script: sr.script });
    })
  );

  return router;
}