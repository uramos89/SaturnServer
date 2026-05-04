import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { SSHConnectSchema, CommandExecSchema } from "../lib/validators.js";
import { decryptCredential, logAudit } from "../lib/server-helpers.js";
import type { SSHAgent, SSHConnectionConfig, SystemMetrics } from "../lib/ssh-agent.js";
import { validateHost } from "../lib/ssh-agent.js";
import type { ScriptGenerator } from "../lib/script-generator.js";
import { evaluateThresholds } from "../services/threshold-engine.js";
import { emitServerMetrics } from "../services/socket-service.js";
import type { ServerDb, SshConnectionDb, OSType, ScriptRequest } from "../lib/types.js";
import { connectViaBastion, execViaBastion } from "../services/bastion-service.js";

// ── validate wrapper (Zod) ──────────────────────────────────────────────
function validate(schema: any) {
  return (req: Request, res: Response, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: result.error.issues.map((i: any) => i.message).join(", "),
      });
    }
    req.body = result.data;
    next();
  };
}

const VAULT_BASE = "IDENTITY/credentials_vault";

export function createServersRouter(
  db: Database.Database,
  sshAgent: SSHAgent,
  ScriptGenerator: typeof import("../lib/script-generator.js").ScriptGenerator,
  decrypt: (text: string) => string,
  updateAllServerMetrics: () => Promise<void>
): Router {
  const router = Router();

  // ── SSH Management ──────────────────────────────────────────────────

  // GET /api/ssh/connections
  router.get("/ssh/connections", (req: Request, res: Response) => {
    const conns = db
      .prepare(
        `SELECT sc.id, sc.serverId, sc.host, sc.port, sc.username, sc.authType, 
                sc.fingerprint, sc.lastConnected, sc.status, s.name as serverName
         FROM ssh_connections sc
         LEFT JOIN servers s ON sc.serverId = s.id`
      )
      .all();
    res.json(conns);
  });

  // POST /api/ssh/connect
  router.post("/ssh/connect", validate(SSHConnectSchema), async (req: Request, res: Response) => {
    const {
      host,
      port = 22,
      username,
      privateKey,
      password,
      bastionHost,
      bastionPort = 22,
      bastionUser,
      bastionKey,
      bastionPassword,
    } = req.body;

    // SSRF Protection
    if (host && !validateHost(host)) {
      return res.status(400).json({ error: "Host not allowed for security reasons", code: "SSRF_BLOCKED" });
    }

    if (!host || !username) {
      return res.status(400).json({ error: "Host and username are required" });
    }

    const config: SSHConnectionConfig = { host, port, username };

    try {
      if (privateKey) {
        config.privateKey = privateKey;
      } else if (password) {
        config.password = password;
      } else {
        const homeKey = path.join(
          process.env.HOME || process.env.USERPROFILE || "/root",
          ".ssh",
          "id_rsa"
        );
        if (fs.existsSync(homeKey)) {
          config.privateKey = fs.readFileSync(homeKey, "utf-8");
        } else {
          return res
            .status(400)
            .json({ error: "No authentication method provided and no default SSH key found" });
        }
      }

      let testResult;

      if (bastionHost) {
        console.log(`[BASTION] Attempting connection to ${host} via ${bastionHost}`);
        const tunnelKey = await connectViaBastion({
          bastionHost,
          bastionPort,
          bastionUser,
          bastionKey,
          bastionPassword,
          targetHost: host,
          targetPort: port,
          targetUser: username,
          targetKey: privateKey,
        });

        const bastionResult = await execViaBastion(tunnelKey, "hostname", {
          bastionHost,
          bastionPort,
          bastionUser,
          bastionKey,
          bastionPassword,
          targetHost: host,
          targetPort: port,
          targetUser: username,
          targetKey: privateKey,
        });

        testResult = {
          success: bastionResult.code === 0,
          message:
            bastionResult.code === 0
              ? "Connected via Bastion"
              : `Bastion error: ${bastionResult.stderr}`,
          metrics: {
            hostname: bastionResult.stdout.trim(),
            cpu: 0,
            memory: 0,
            disk: 0,
            uptime: 0,
            os: "linux",
            kernel: "unknown",
            loadAvg: [0, 0, 0],
          },
        };
      } else {
        const connKey = await sshAgent.connect(config);
        const metrics = await sshAgent.getSystemMetrics(connKey);
        testResult = { success: true, message: `Connected to ${config.host}`, metrics };
      }

      if (!testResult.success) {
        return res.status(401).json({ error: testResult.message });
      }

      const metrics = testResult.metrics!;
      const serverId = `srv-${host.replace(/[^a-zA-Z0-9]/g, "-")}`;
      const os =
        metrics.os.toLowerCase().includes("ubuntu") ||
        metrics.os.toLowerCase().includes("debian") ||
        metrics.os.toLowerCase().includes("centos") ||
        metrics.os.toLowerCase().includes("red hat") ||
        metrics.os.toLowerCase().includes("linux")
          ? "linux"
          : metrics.os.toLowerCase().includes("windows")
            ? "windows"
            : "unix";

      db.prepare(
        `INSERT OR REPLACE INTO servers 
         (id, name, ip, os, status, cpu, memory, disk, uptime, kernel, load_avg, lastCheck, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        serverId,
        metrics.hostname,
        host,
        os,
        "online",
        metrics.cpu,
        metrics.memory,
        metrics.disk,
        metrics.uptime,
        metrics.kernel,
        JSON.stringify(metrics.loadAvg),
        new Date().toISOString(),
        "ssh,managed"
      );

      const connId = `ssh-${serverId}`;
      // Already imported at top
      const encryptedKeyVal = privateKey ? encryptCredential(privateKey) : null;
      const encryptedPassVal = password ? encryptCredential(password) : null;

      db.prepare(
        `INSERT OR REPLACE INTO ssh_connections 
         (id, serverId, host, port, username, authType, encryptedKey, encryptedPassword, fingerprint, lastConnected, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        connId,
        serverId,
        host,
        port,
        username,
        privateKey ? "key" : "password",
        encryptedKeyVal,
        encryptedPassVal,
        metrics.hostname,
        new Date().toISOString(),
        "connected"
      );

      logAudit(db, "SYSTEM", "SSH_CONNECTED", `SSH connection established to ${username}@${host}:${port} (${metrics.hostname})`, {
        compliance_tags: ["GDPR", "PCI-DSS"],
      });

      res.json({
        success: true,
        serverId,
        hostname: metrics.hostname,
        metrics,
        message: `Connected to ${metrics.hostname}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/ssh/disconnect
  router.post("/ssh/disconnect", async (req: Request, res: Response) => {
    const { serverId } = req.body;
    if (!serverId) return res.status(400).json({ error: "serverId required" });

    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(serverId) as any;
    if (!conn) return res.status(404).json({ error: "Connection not found" });

    const key = `${conn.username}@${conn.host}:${conn.port}`;
    try {
      await sshAgent.disconnect(key);
    } catch {}

    db.prepare("UPDATE ssh_connections SET status = 'disconnected' WHERE serverId = ?").run(serverId);
    db.prepare("UPDATE servers SET status = 'offline' WHERE id = ?").run(serverId);

    res.json({ success: true });
  });

  // ── Server CRUD ──────────────────────────────────────────────────────

  // GET /api/servers
  router.get("/servers", (req: Request, res: Response) => {
    const servers = db
      .prepare(
        `SELECT s.*, sc.status as sshStatus, sc.lastConnected, sc.host as connHost
         FROM servers s
         LEFT JOIN ssh_connections sc ON sc.serverId = s.id
         ORDER BY s.name ASC`
      )
      .all();
    res.json(
      servers.map((s: any) => ({
        ...s,
        status:
          s.sshStatus === "connected"
            ? "online"
            : s.sshStatus === "disconnected"
              ? "offline"
              : s.sshStatus === "connecting"
                ? "degraded"
                : !s.sshStatus
                  ? "unmanaged"
                  : s.status,
        tags: s.tags ? s.tags.split(",") : [],
        load_avg: s.load_avg ? JSON.parse(s.load_avg) : [],
      }))
    );
  });

  // DELETE /api/servers/:id
  router.delete("/servers/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const server = db.prepare("SELECT * FROM servers WHERE id = ?").get(id) as any;
    if (!server) return res.status(404).json({ error: "Server not found" });

    db.prepare("DELETE FROM ssh_connections WHERE serverId = ?").run(id);
    db.prepare("DELETE FROM threshold_configs WHERE serverId = ?").run(id);
    db.prepare("DELETE FROM incidents WHERE serverId = ?").run(id);
    db.prepare("DELETE FROM obpa_cycles WHERE incidentId IN (SELECT id FROM incidents WHERE serverId = ?)").run(id);
    db.prepare("DELETE FROM process_metrics_history WHERE serverId = ?").run(id);
    db.prepare("DELETE FROM servers WHERE id = ?").run(id);

    logAudit(db, "SYSTEM", "SERVER_DELETED", `Server ${server.name} (${server.ip}) removed from management`, {
      serverId: id,
    });

    const connKey = `${server.name}@${server.ip}`;
    sshAgent.disconnect(connKey).catch(() => {});

    res.json({ success: true, message: `Server ${server.name} deleted` });
  });

  // ── PUT /api/servers/:id/config — Update server configuration ────
  router.put("/servers/:id/config", (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, password, privateKey, port, thresholds } = req.body;
    
    // Update SSH credentials
    if (username || password || privateKey || port) {
      const fields: string[] = [];
      const values: any[] = [];
      if (username) { fields.push("username = ?"); values.push(username); }
      if (password) { fields.push("encryptedPassword = ?"); values.push(password); }
      if (privateKey) { fields.push("encryptedKey = ?"); values.push(privateKey); }
      if (port) { fields.push("port = ?"); values.push(parseInt(port as string)); }
      values.push(id);
      if (fields.length > 0) {
        db.prepare(`UPDATE ssh_connections SET ${fields.join(", ")} WHERE serverId = ?`).run(...values);
      }
    }
    
    // Update thresholds
    if (Array.isArray(thresholds)) {
      db.prepare("DELETE FROM threshold_configs WHERE serverId = ?").run(id);
      const insert = db.prepare("INSERT INTO threshold_configs (serverId, metric, warning, critical) VALUES (?, ?, ?, ?)");
      for (const t of thresholds) {
        insert.run(id, t.metric, t.warning, t.critical);
      }
    }
    
    // Mark connection for refresh
    db.prepare("UPDATE ssh_connections SET status = 'disconnected' WHERE serverId = ?").run(id);
    res.json({ success: true, message: "Configuration saved. Reconnect to apply SSH changes." });
  });

  // ── Server Metrics / Refresh / Exec ──────────────────────────────────

  // POST /api/servers/:id/refresh
  router.post("/servers/:id/refresh", async (req: Request, res: Response) => {
    const { id } = req.params;
    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(id) as any;
    if (!conn) return res.status(404).json({ error: "No SSH connection for this server" });

    try {
      const key = `${conn.username}@${conn.host}:${conn.port}`;
      let metrics: SystemMetrics;

      try {
        metrics = await sshAgent.getSystemMetrics(key);
      } catch {
        const config: SSHConnectionConfig = {
          host: conn.host,
          port: conn.port,
          username: conn.username,
        };
        if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
        if (conn.encryptedPassword) config.password = decrypt(conn.encryptedPassword);
        await sshAgent.connect(config);
        metrics = await sshAgent.getSystemMetrics(key);
      }

      const os =
        metrics.os.toLowerCase().includes("linux")
          ? "linux"
          : metrics.os.toLowerCase().includes("windows")
            ? "windows"
            : "unix";

      db.prepare(
        `UPDATE servers SET 
         cpu = ?, memory = ?, disk = ?, uptime = ?, os = ?, kernel = ?,
         load_avg = ?, lastCheck = ?, status = ? WHERE id = ?`
      ).run(
        metrics.cpu,
        metrics.memory,
        metrics.disk,
        metrics.uptime,
        os,
        metrics.kernel,
        JSON.stringify(metrics.loadAvg),
        new Date().toISOString(),
        metrics.cpu > 90 || metrics.memory > 90 ? "degraded" : "online",
        id
      );

      db.prepare("UPDATE ssh_connections SET lastConnected = ?, status = 'connected' WHERE serverId = ?").run(
        new Date().toISOString(),
        id
      );

      res.json({ success: true, metrics });
    } catch (error: any) {
      db.prepare("UPDATE servers SET status = 'offline' WHERE id = ?").run(id);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/servers/:id/exec
  router.post("/servers/:id/exec", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { command } = req.body;

    if (!command) return res.status(400).json({ error: "Command required" });

    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(id) as any;
    if (!conn) return res.status(404).json({ error: "No SSH connection for this server" });

    try {
      const key = `${conn.username}@${conn.host}:${conn.port}`;

      try {
        await sshAgent.getSystemMetrics(key);
      } catch {
        const config: SSHConnectionConfig = {
          host: conn.host,
          port: conn.port,
          username: conn.username,
        };
        if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
        if (conn.encryptedPassword) config.password = decrypt(conn.encryptedPassword);
        await sshAgent.connect(config);
      }

      const result = await sshAgent.execCommand(key, command);

      db.prepare(
        `INSERT INTO command_history (id, serverId, command, stdout, stderr, exitCode, executedBy, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        `cmd-${Date.now()}`,
        id,
        command,
        result.stdout.substring(0, 5000),
        result.stderr.substring(0, 1000),
        result.code,
        "admin",
        new Date().toISOString()
      );

      logAudit(db, "USER", "CMD_EXECUTED", `Command executed on ${conn.host}: ${command.substring(0, 100)}`, {
        command: command.substring(0, 500),
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/servers/:id/history
  router.get("/servers/:id/history", (req: Request, res: Response) => {
    const { id } = req.params;
    const history = db
      .prepare("SELECT * FROM command_history WHERE serverId = ? ORDER BY timestamp DESC LIMIT 50")
      .all();
    res.json(history);
  });

  // POST /api/servers/:id/script
  router.post("/servers/:id/script", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { script } = req.body;

    if (!script) return res.status(400).json({ error: "Script required" });

    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(id) as any;
    if (!conn) return res.status(404).json({ error: "No SSH connection for this server" });

    try {
      const key = `${conn.username}@${conn.host}:${conn.port}`;

      try {
        await sshAgent.getSystemMetrics(key);
      } catch {
        const config: SSHConnectionConfig = {
          host: conn.host,
          port: conn.port,
          username: conn.username,
        };
        if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
        if (conn.encryptedPassword) config.password = decrypt(conn.encryptedPassword);
        await sshAgent.connect(config);
      }

      const result = await sshAgent.execScript(key, script);
      logAudit(db, "USER", "SCRIPT_EXECUTED", `Remediation script executed on ${conn.host} (exit: ${result.code})`);

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── SSE stream ──────────────────────────────────────────────────────

  // GET /api/servers/ssh/stream
  router.get("/servers/ssh/stream", (req: Request, res: Response) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const sendMetrics = async () => {
      try {
        await updateAllServerMetrics();
        const servers = db.prepare("SELECT * FROM servers").all();
        res.write(
          `data: ${JSON.stringify({ type: "metrics", servers, timestamp: new Date().toISOString() })}\n\n`
        );
      } catch {}
    };

    sendMetrics();
    const interval = setInterval(sendMetrics, 10000);

    req.on("close", () => {
      clearInterval(interval);
    });
  });

  // ── Server Logs ──────────────────────────────────────────────────────

  // GET /api/servers/:id/logs
  router.get("/servers/:id/logs", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { lines, service } = req.query;
    try {
      const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(id) as SshConnectionDb | undefined;
      if (!conn) return res.status(404).json({ error: "No SSH connection for this server" });

      const server = db.prepare("SELECT os FROM servers WHERE id = ?").get(id) as ServerDb | undefined;
      const osType = (server?.os === "windows" ? "windows" : "linux") as OSType;

      const key = `${conn.username}@${conn.host}:${conn.port}`;
      const scriptReq: ScriptRequest = {
        category: "logs",
        action: "get",
        os: osType,
        params: { lines: lines || 50, service },
      };

      const { script } = ScriptGenerator.generate(scriptReq);
      const result = await sshAgent.execCommand(key, script);

      res.json({ logs: result.stdout });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
