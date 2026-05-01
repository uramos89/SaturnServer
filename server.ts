import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import crypto from "crypto";
import { sshAgent, type SSHConnectionConfig, type SystemMetrics } from "./src/lib/ssh-agent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
const db = new Database("saturn.db");
db.pragma("journal_mode = WAL");

// Encryption key for SSH credentials (derived from machine + a secret pepper)
const ENCRYPTION_KEY = crypto.createHash("sha256").update(process.env.SSH_ENCRYPTION_PEPPER || "saturn-default-pepper-change-me").digest();

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

// Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT,
    ip TEXT,
    os TEXT,
    status TEXT,
    cpu REAL,
    memory REAL,
    disk REAL,
    uptime INTEGER,
    kernel TEXT,
    load_avg TEXT,
    lastCheck TEXT,
    tags TEXT
  );

  CREATE TABLE IF NOT EXISTS ssh_connections (
    id TEXT PRIMARY KEY,
    serverId TEXT UNIQUE,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 22,
    username TEXT NOT NULL,
    authType TEXT DEFAULT 'key',
    encryptedKey TEXT,
    encryptedPassword TEXT,
    fingerprint TEXT,
    lastConnected TEXT,
    status TEXT DEFAULT 'disconnected',
    FOREIGN KEY (serverId) REFERENCES servers(id)
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    serverId TEXT,
    severity TEXT,
    title TEXT,
    description TEXT,
    status TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS obpa_cycles (
    id TEXT PRIMARY KEY,
    incidentId TEXT,
    phase TEXT,
    observation TEXT,
    proposal TEXT,
    remediation_script TEXT,
    execution_result TEXT,
    consolidated_knowledge TEXT,
    confidence REAL,
    status TEXT DEFAULT 'pending',
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS contextp_entries (
    path TEXT PRIMARY KEY,
    content TEXT,
    type TEXT,
    lastUpdated TEXT
  );

  CREATE TABLE IF NOT EXISTS notification_configs (
    id TEXT PRIMARY KEY,
    type TEXT,
    destination TEXT,
    config TEXT,
    enabled INTEGER
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    type TEXT,
    event TEXT,
    detail TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS command_history (
    id TEXT PRIMARY KEY,
    serverId TEXT,
    command TEXT,
    stdout TEXT,
    stderr TEXT,
    exitCode INTEGER,
    executedBy TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    api_key TEXT,
    endpoint TEXT,
    enabled INTEGER DEFAULT 0,
    created_at TEXT
  );
`);

// Add column migration for new columns (safe if they already exist)
try { db.exec("ALTER TABLE servers ADD COLUMN disk REAL"); } catch {}
try { db.exec("ALTER TABLE servers ADD COLUMN uptime INTEGER"); } catch {}
try { db.exec("ALTER TABLE servers ADD COLUMN kernel TEXT"); } catch {}
try { db.exec("ALTER TABLE servers ADD COLUMN load_avg TEXT"); } catch {}

// Notification Service
async function sendNotification(type: string, title: string, message: string, severity: string) {
  const configs = db.prepare("SELECT * FROM notification_configs WHERE enabled = 1").all() as any[];
  
  for (const config of configs) {
    try {
      if (config.type === 'webhook' || config.type === 'slack') {
        const axios = (await import("axios")).default;
        await axios.post(config.destination, {
          text: `*[SATURN - ${severity.toUpperCase()}]* ${title}\n${message}`,
          title, message, severity,
          timestamp: new Date().toISOString()
        });
      } else if (config.type === 'email') {
        const nodemailer = (await import("nodemailer")).default;
        const smtpConfig = JSON.parse(config.config);
        const transporter = nodemailer.createTransport(smtpConfig);
        await transporter.sendMail({
          from: `"Saturn Core" <${smtpConfig.auth.user}>`,
          to: config.destination,
          subject: `[SATURN] ${severity.toUpperCase()}: ${title}`,
          text: message
        });
      }
    } catch (error) {
      console.error(`Failed to send notification to ${config.destination}:`, error);
    }
  }
}

// LLM Adapter Logic
async function getLLMResponse(provider: string, prompt: string) {
  if (provider === 'gemini') {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return result.text;
  } else if (provider === 'openai') {
    const axios = (await import("axios")).default;
    const response = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    return response.data.choices[0].message.content;
  } else if (provider === 'ollama') {
    const axios = (await import("axios")).default;
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3",
      prompt: prompt,
      stream: false
    });
    return response.data.response;
  }
  throw new Error(`Provider ${provider} not supported`);
}

// Background metrics updater
async function updateAllServerMetrics() {
  const connections = db.prepare("SELECT * FROM ssh_connections WHERE status = 'connected'").all() as any[];
  
  for (const conn of connections) {
    try {
      const key = `${conn.username}@${conn.host}:${conn.port}`;
      // Check if we have an active connection
      let metrics: SystemMetrics;
      try {
        metrics = await sshAgent.getSystemMetrics(key);
      } catch {
        // Reconnect
        const config: SSHConnectionConfig = {
          host: conn.host,
          port: conn.port,
          username: conn.username
        };
        if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
        if (conn.encryptedPassword) config.password = decrypt(conn.encryptedPassword);
        
        await sshAgent.connect(config);
        metrics = await sshAgent.getSystemMetrics(key);
      }
      
      const os = metrics.os.toLowerCase().includes("ubuntu") || metrics.os.toLowerCase().includes("debian") || metrics.os.toLowerCase().includes("centos") || metrics.os.toLowerCase().includes("red hat") || metrics.os.toLowerCase().includes("linux") ? "linux" :
                 metrics.os.toLowerCase().includes("windows") ? "windows" : "unix";

      db.prepare(`UPDATE servers SET 
        cpu = ?, memory = ?, disk = ?, uptime = ?, os = ?, kernel = ?, 
        load_avg = ?, lastCheck = ?, status = ? WHERE id = ?`)
        .run(
          metrics.cpu, metrics.memory, metrics.disk, metrics.uptime,
          os, metrics.kernel, JSON.stringify(metrics.loadAvg),
          new Date().toISOString(),
          metrics.cpu > 90 || metrics.memory > 90 ? "degraded" : "online",
          conn.serverId
        );

      db.prepare("UPDATE ssh_connections SET lastConnected = ? WHERE id = ?")
        .run(new Date().toISOString(), conn.id);

    } catch (error: any) {
      console.error(`Failed to update metrics for ${conn.host}:`, error.message);
      db.prepare("UPDATE servers SET status = 'offline', lastCheck = ? WHERE id = ?")
        .run(new Date().toISOString(), conn.serverId);
    }
  }
}

// Seed Data (if empty) - keep mock servers as fallback
const serverCount = db.prepare("SELECT COUNT(*) as count FROM servers").get() as { count: number };
if (serverCount.count === 0) {
  const insertServer = db.prepare("INSERT OR IGNORE INTO servers (id, name, ip, os, status, cpu, memory, disk, uptime, kernel, load_avg, lastCheck, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insertServer.run("srv-001", "local-dev", "127.0.0.1", "linux", "pending", 0, 0, 0, 0, "", "[]", new Date().toISOString(), "local,pending-ssh");
  
  // Initial ContextP Knowledge
  const insertContext = db.prepare("INSERT OR IGNORE INTO contextp_entries (path, content, type, lastUpdated) VALUES (?, ?, ?, ?)");
  insertContext.run("TECH/ssh/baseline.md", "# SSH Management\n- Port 22 default\n- Key-based auth preferred\n- Keepalive every 10s\n- Connection pooling enabled", "TECH", new Date().toISOString());
  insertContext.run("TECH/linux/monitoring.md", "# Linux Monitoring Commands\n- CPU: /proc/stat\n- Memory: free\n- Disk: df\n- Uptime: /proc/uptime\n- Load: /proc/loadavg", "TECH", new Date().toISOString());
  insertContext.run("CONTRACTS/root_contract.md", "# Root Contract\nEvery action must be audited. No direct root login.", "CONTRACTS", new Date().toISOString());
  insertContext.run("PARAMS/preferences.md", "# User Preferences\n- Language: Spanish\n- AI Provider: Gemini 2.0\n- Strict Mode: Enabled", "PARAMS", new Date().toISOString());
  insertContext.run("_INDEX/INDEX_MASTER.md", "# Index Master\n- TECH: General documentation\n- SSH: Connection management\n- CONTRACTS: Root rules\n- AUDIT: Execution history", "INDEX", new Date().toISOString());
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // ── Health Check ──────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => {
    const sshCount = db.prepare("SELECT COUNT(*) as c FROM ssh_connections WHERE status = 'connected'").get() as any;
    const serverCount = db.prepare("SELECT COUNT(*) as c FROM servers").get() as any;
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(), 
      version: "4.0.0",
      engine: "ARES 1.0.0",
      ssh: { connected: sshCount.c, total: db.prepare("SELECT COUNT(*) as c FROM ssh_connections").get() as any },
      servers: serverCount.c
    });
  });

  // ── SSH Management Endpoints ──────────────────────────────────────────────

  // GET /api/ssh/connections - List all SSH connections
  app.get("/api/ssh/connections", (req, res) => {
    const conns = db.prepare(`
      SELECT sc.id, sc.serverId, sc.host, sc.port, sc.username, sc.authType, 
             sc.fingerprint, sc.lastConnected, sc.status, s.name as serverName
      FROM ssh_connections sc
      LEFT JOIN servers s ON sc.serverId = s.id
    `).all();
    res.json(conns);
  });

  // POST /api/ssh/connect - Test connection and register server
  app.post("/api/ssh/connect", async (req, res) => {
    const { host, port = 22, username, privateKey, password } = req.body;
    
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
        // Try default SSH key
        const homeKey = path.join(process.env.HOME || process.env.USERPROFILE || "/root", ".ssh", "id_rsa");
        if (fs.existsSync(homeKey)) {
          config.privateKey = fs.readFileSync(homeKey, "utf-8");
        } else {
          return res.status(400).json({ error: "No authentication method provided and no default SSH key found" });
        }
      }

      const testResult = await sshAgent.testConnection(config);
      
      if (!testResult.success) {
        return res.status(401).json({ error: testResult.message });
      }

      const metrics = testResult.metrics!;
      const serverId = `srv-${host.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const os = metrics.os.toLowerCase().includes("ubuntu") || metrics.os.toLowerCase().includes("debian") || metrics.os.toLowerCase().includes("centos") || metrics.os.toLowerCase().includes("red hat") || metrics.os.toLowerCase().includes("linux") ? "linux" :
                 metrics.os.toLowerCase().includes("windows") ? "windows" : "unix";

      // Upsert server
      db.prepare(`INSERT OR REPLACE INTO servers 
        (id, name, ip, os, status, cpu, memory, disk, uptime, kernel, load_avg, lastCheck, tags) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          serverId, metrics.hostname, host, os, "online",
          metrics.cpu, metrics.memory, metrics.disk, metrics.uptime,
          metrics.kernel, JSON.stringify(metrics.loadAvg),
          new Date().toISOString(), "ssh,managed"
        );

      // Upsert SSH connection
      const connId = `ssh-${serverId}`;
      db.prepare(`INSERT OR REPLACE INTO ssh_connections 
        (id, serverId, host, port, username, authType, encryptedKey, encryptedPassword, fingerprint, lastConnected, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          connId, serverId, host, port, username,
          privateKey ? "key" : "password",
          privateKey ? encrypt(privateKey) : null,
          password ? encrypt(password) : null,
          metrics.hostname,
          new Date().toISOString(), "connected"
        );

      // Log audit
      db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "SYSTEM", "SSH_CONNECTED", 
          `SSH connection established to ${username}@${host}:${port} (${metrics.hostname})`, 
          new Date().toISOString());

      res.json({ 
        success: true, 
        serverId, 
        hostname: metrics.hostname, 
        metrics,
        message: `Connected to ${metrics.hostname}`
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/ssh/disconnect - Disconnect from server
  app.post("/api/ssh/disconnect", async (req, res) => {
    const { serverId } = req.body;
    if (!serverId) return res.status(400).json({ error: "serverId required" });

    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get() as any;
    if (!conn) return res.status(404).json({ error: "Connection not found" });

    const key = `${conn.username}@${conn.host}:${conn.port}`;
    try { await sshAgent.disconnect(key); } catch {}

    db.prepare("UPDATE ssh_connections SET status = 'disconnected' WHERE serverId = ?").run(serverId);
    db.prepare("UPDATE servers SET status = 'offline' WHERE id = ?").run(serverId);

    res.json({ success: true });
  });

  // POST /api/servers/:id/refresh - Refresh metrics via SSH
  app.post("/api/servers/:id/refresh", async (req, res) => {
    const { id } = req.params;
    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get() as any;
    if (!conn) return res.status(404).json({ error: "No SSH connection for this server" });

    try {
      const key = `${conn.username}@${conn.host}:${conn.port}`;
      let metrics: SystemMetrics;

      try {
        metrics = await sshAgent.getSystemMetrics(key);
      } catch {
        // Reconnect
        const config: SSHConnectionConfig = {
          host: conn.host, port: conn.port, username: conn.username
        };
        if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
        if (conn.encryptedPassword) config.password = decrypt(conn.encryptedPassword);
        await sshAgent.connect(config);
        metrics = await sshAgent.getSystemMetrics(key);
      }

      const os = metrics.os.toLowerCase().includes("linux") ? "linux" :
                 metrics.os.toLowerCase().includes("windows") ? "windows" : "unix";

      db.prepare(`UPDATE servers SET 
        cpu = ?, memory = ?, disk = ?, uptime = ?, os = ?, kernel = ?,
        load_avg = ?, lastCheck = ?, status = ? WHERE id = ?`)
        .run(metrics.cpu, metrics.memory, metrics.disk, metrics.uptime,
             os, metrics.kernel, JSON.stringify(metrics.loadAvg),
             new Date().toISOString(),
             metrics.cpu > 90 || metrics.memory > 90 ? "degraded" : "online", id);

      db.prepare("UPDATE ssh_connections SET lastConnected = ?, status = 'connected' WHERE serverId = ?")
        .run(new Date().toISOString(), id);

      res.json({ success: true, metrics });
    } catch (error: any) {
      db.prepare("UPDATE servers SET status = 'offline' WHERE id = ?").run(id);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/servers/:id/exec - Execute command on server via SSH
  app.post("/api/servers/:id/exec", async (req, res) => {
    const { id } = req.params;
    const { command } = req.body;
    
    if (!command) return res.status(400).json({ error: "Command required" });

    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get() as any;
    if (!conn) return res.status(404).json({ error: "No SSH connection for this server" });

    try {
      const key = `${conn.username}@${conn.host}:${conn.port}`;

      // Ensure connected
      try { await sshAgent.getSystemMetrics(key); } catch {
        const config: SSHConnectionConfig = {
          host: conn.host, port: conn.port, username: conn.username
        };
        if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
        if (conn.encryptedPassword) config.password = decrypt(conn.encryptedPassword);
        await sshAgent.connect(config);
      }

      const result = await sshAgent.execCommand(key, command);

      // Log to command history
      db.prepare(`INSERT INTO command_history (id, serverId, command, stdout, stderr, exitCode, executedBy, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(`cmd-${Date.now()}`, id, command, result.stdout.substring(0, 5000), 
             result.stderr.substring(0, 1000), result.code, "admin", new Date().toISOString());

      // Audit log
      db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "USER", "CMD_EXECUTED", 
          `Command executed on ${conn.host}: ${command.substring(0, 100)}`, new Date().toISOString());

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/servers/:id/history - Command history for a server
  app.get("/api/servers/:id/history", (req, res) => {
    const { id } = req.params;
    const history = db.prepare("SELECT * FROM command_history WHERE serverId = ? ORDER BY timestamp DESC LIMIT 50").all();
    res.json(history);
  });

  // POST /api/servers/:id/script - Execute remediation script via SSH
  app.post("/api/servers/:id/script", async (req, res) => {
    const { id } = req.params;
    const { script } = req.body;
    
    if (!script) return res.status(400).json({ error: "Script required" });

    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get() as any;
    if (!conn) return res.status(404).json({ error: "No SSH connection for this server" });

    try {
      const key = `${conn.username}@${conn.host}:${conn.port}`;

      try { await sshAgent.getSystemMetrics(key); } catch {
        const config: SSHConnectionConfig = {
          host: conn.host, port: conn.port, username: conn.username
        };
        if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
        if (conn.encryptedPassword) config.password = decrypt(conn.encryptedPassword);
        await sshAgent.connect(config);
      }

      const result = await sshAgent.execScript(key, script);

      // Audit log
      db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "USER", "SCRIPT_EXECUTED",
          `Remediation script executed on ${conn.host} (exit: ${result.code})`, new Date().toISOString());

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/servers/ssh/stream - SSE stream for real-time metrics
  app.get("/api/servers/ssh/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    const sendMetrics = async () => {
      try {
        await updateAllServerMetrics();
        const servers = db.prepare("SELECT * FROM servers").all();
        res.write(`data: ${JSON.stringify({ type: "metrics", servers, timestamp: new Date().toISOString() })}\n\n`);
      } catch {}
    };

    // Send initial data
    sendMetrics();

    const interval = setInterval(sendMetrics, 10000);

    req.on("close", () => {
      clearInterval(interval);
    });
  });

  // ── Existing API Routes ───────────────────────────────────────────────────

  app.get("/api/servers", (req, res) => {
    const servers = db.prepare("SELECT * FROM servers").all();
    res.json(servers.map((s: any) => ({ 
      ...s, 
      tags: s.tags ? s.tags.split(",") : [],
      load_avg: s.load_avg ? JSON.parse(s.load_avg) : []
    })));
  });

  app.get("/api/incidents", (req, res) => {
    const incidents = db.prepare("SELECT * FROM incidents ORDER BY timestamp DESC").all();
    res.json(incidents);
  });

  app.get("/api/contextp", (req, res) => {
    const entries = db.prepare("SELECT * FROM contextp_entries").all();
    res.json(entries);
  });

  app.get("/api/notifications", (req, res) => {
    const configs = db.prepare("SELECT * FROM notification_configs").all();
    res.json(configs);
  });

  app.post("/api/notifications/config", (req, res) => {
    const { type, destination, config, enabled } = req.body;
    const id = `notif-${Date.now()}`;
    db.prepare("INSERT OR REPLACE INTO notification_configs (id, type, destination, config, enabled) VALUES (?, ?, ?, ?, ?)")
      .run(id, type, destination, JSON.stringify(config), enabled ? 1 : 0);
    res.json({ id, success: true });
  });

  app.get("/api/audit", (req, res) => {
    const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").all();
    res.json(logs);
  });

  app.get("/api/obpa/pending", (req, res) => {
    const pending = db.prepare("SELECT * FROM obpa_cycles WHERE status = 'pending'").all();
    res.json(pending);
  });

  app.post("/api/obpa/approve", async (req, res) => {
    const { obpaId, approved } = req.body;
    const cycle = db.prepare("SELECT * FROM obpa_cycles WHERE id = ?").get() as any;
    if (!cycle) return res.status(404).json({ error: "Cycle not found" });

    if (approved) {
      db.prepare("UPDATE obpa_cycles SET status = 'approved' WHERE id = ?").run(obpaId);
      db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "USER", "REMEDIATION_APPROVED", `User approved remediation for incident ${cycle.incidentId}`, new Date().toISOString());
      
      // Execute remediation script via SSH if we have a connection
      const incident = db.prepare("SELECT * FROM incidents WHERE id = ?").get() as any;
      if (incident) {
        const sshConn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get() as any;
        if (sshConn && cycle.remediation_script) {
          try {
            const key = `${sshConn.username}@${sshConn.host}:${sshConn.port}`;
            try { await sshAgent.getSystemMetrics(key); } catch {
              const config: SSHConnectionConfig = {
                host: sshConn.host, port: sshConn.port, username: sshConn.username
              };
              if (sshConn.encryptedKey) config.privateKey = decrypt(sshConn.encryptedKey);
              if (sshConn.encryptedPassword) config.password = decrypt(sshConn.encryptedPassword);
              await sshAgent.connect(config);
            }
            const execResult = await sshAgent.execScript(key, cycle.remediation_script);
            db.prepare("UPDATE obpa_cycles SET execution_result = ? WHERE id = ?")
              .run(`Exit code: ${execResult.code}\n${execResult.stdout.substring(0, 2000)}`, obpaId);
            
            // Refresh metrics after remediation
            const metrics = await sshAgent.getSystemMetrics(key);
            const os = metrics.os.toLowerCase().includes("linux") ? "linux" :
                       metrics.os.toLowerCase().includes("windows") ? "windows" : "unix";
            db.prepare(`UPDATE servers SET cpu = ?, memory = ?, disk = ?, status = ?, lastCheck = ? WHERE id = ?`)
              .run(metrics.cpu, metrics.memory, metrics.disk, "online", new Date().toISOString(), sshConn.serverId);
          } catch (e: any) {
            db.prepare("UPDATE obpa_cycles SET execution_result = ? WHERE id = ?")
              .run(`SSH execution failed: ${e.message}`, obpaId);
          }
        }
      }

      db.prepare("UPDATE incidents SET status = 'closed' WHERE id = ?").run(cycle.incidentId);
      await sendNotification("success", "Remediation Successful", `Remediation applied for incident ${cycle.incidentId} after manual approval.`, "success");
    } else {
      db.prepare("UPDATE obpa_cycles SET status = 'rejected' WHERE id = ?").run(obpaId);
      db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(cycle.incidentId);
    }
    res.json({ success: true });
  });

  app.post("/api/incidents/create", async (req, res) => {
    const { serverId, title, description, severity } = req.body;
    const id = `inc-${Date.now()}`;
    const timestamp = new Date().toISOString();
    db.prepare("INSERT INTO incidents (id, serverId, title, description, severity, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, serverId, title, description, severity, "open", timestamp);
    
    db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
      .run(`audit-${Date.now()}`, "SYSTEM", "INCIDENT_CREATED", `Incident ${id} on ${serverId}: ${title}`, timestamp);

    await sendNotification("warning", `New Incident: ${title}`, description, severity);
    
    res.json({ id, status: "open" });
  });

  // Neural Core: OBPA Cycle with SSH context
  app.post("/api/neural/analyze", async (req, res) => {
    const { incidentId, provider = 'gemini' } = req.body;
    const incident = db.prepare("SELECT * FROM incidents WHERE id = ?").get() as any;
    const server = db.prepare("SELECT * FROM servers WHERE id = ?").get() as any;
    
    if (!incident || !server) return res.status(404).json({ error: "Not found" });

    try {
      // Get SSH real-time metrics if available
      let realTimeMetrics = "";
      const sshConn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ? AND status = 'connected'").get() as any;
      if (sshConn) {
        try {
          const key = `${sshConn.username}@${sshConn.host}:${sshConn.port}`;
          const metrics = await sshAgent.getSystemMetrics(key);
          realTimeMetrics = `
Real-time SSH Metrics (${sshConn.host}):
- CPU: ${metrics.cpu}%
- Memory: ${metrics.memory}%
- Disk: ${metrics.disk}%
- Uptime: ${Math.floor(metrics.uptime / 3600)}h
- Load Avg: ${metrics.loadAvg.join(", ")}
- Kernel: ${metrics.kernel}
- Processes: ${metrics.processes}
`;
        } catch {}
      }
      
      const prompt = `
        Context: Saturn Autonomous Infrastructure Management.
        Engine: Ares Neural Engine v1.0
        Memory: ContextP Organizational Knowledge Base
        Incident: ${incident.title} - ${incident.description}
        Server: ${server.name} (${server.os}, ${server.ip})
        ${realTimeMetrics}
        Knowledge Base: ${JSON.stringify(db.prepare("SELECT * FROM contextp_entries").all())}
        
        Execute the OBPA (Observe, Propose, Execute, Bitácora, Consolidate) cycle.
        Return a JSON with:
        {
          "observation": "detailed analysis of what happened",
          "proposal": "suggested fix",
          "remediation_script": "shell script (bash for Linux, powershell for Windows)",
          "consolidated_knowledge": "new entry for ContextP",
          "confidence": 0-1
        }
      `;

      const text = await getLLMResponse(provider, prompt);
      const jsonStr = text.replace(/```json|```/g, "").trim();
      const aiResponse = JSON.parse(jsonStr);

      const obpaId = `obpa-${Date.now()}`;
      db.prepare(`
        INSERT INTO obpa_cycles (id, incidentId, phase, observation, proposal, remediation_script, execution_result, consolidated_knowledge, confidence, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        obpaId, incidentId, "PROPOSE",
        aiResponse.observation, aiResponse.proposal,
        aiResponse.remediation_script, "Waiting for Approval",
        aiResponse.consolidated_knowledge, aiResponse.confidence,
        "pending", new Date().toISOString()
      );

      db.prepare("UPDATE incidents SET status = 'analyzing' WHERE id = ?").run(incidentId);
      
      db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "NEURAL", "ANALYSIS_COMPLETE", 
          `Neural analysis for ${incidentId} complete with ${(aiResponse.confidence * 100).toFixed(1)}% confidence`, 
          new Date().toISOString());

      res.json({ success: true, obpaId, analysis: aiResponse });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── AI Providers & Models ──────────────────────────────────────────────
  const AI_PROVIDERS = [
    { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"] },
    { id: "anthropic", name: "Anthropic", models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku", "claude-3.5-sonnet", "claude-3.5-haiku"] },
    { id: "google", name: "Google AI", models: ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"] },
    { id: "meta", name: "Meta (Llama)", models: ["llama-3.1-405b", "llama-3.1-70b", "llama-3.1-8b", "llama-3-70b", "llama-3-8b"] },
    { id: "mistral", name: "Mistral AI", models: ["mistral-large", "mistral-medium", "mistral-small", "mixtral-8x7b", "codestral"] },
    { id: "cohere", name: "Cohere", models: ["command-r-plus", "command-r", "command-light", "embed-english-v3", "embed-multilingual-v3"] },
    { id: "deepseek", name: "DeepSeek", models: ["deepseek-chat", "deepseek-coder", "deepseek-v2", "deepseek-r1"] },
    { id: "xai", name: "xAI (Grok)", models: ["grok-1", "grok-1.5", "grok-2"] },
    { id: "perplexity", name: "Perplexity", models: ["sonar-pro", "sonar-small", "mixtral-8x7b-instruct"] },
    { id: "together", name: "Together AI", models: ["mixtral-8x22b", "llama-3-70b", "deepseek-coder-33b", "qwen-72b"] },
    { id: "fireworks", name: "Fireworks AI", models: ["llama-v3-70b", "mixtral-8x7b", "deepseek-coder-33b", "qwen-72b-chat"] },
    { id: "groq", name: "Groq", models: ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"] },
    { id: "replicate", name: "Replicate", models: ["llama-3-70b", "mixtral-8x7b", "stable-diffusion", "whisper"] },
    { id: "huggingface", name: "Hugging Face", models: ["mistral-7b", "llama-3-8b", "falcon-7b", "zephyr-7b", "codellama-34b"] },
    { id: "ollama", name: "Ollama (Local)", models: ["llama3", "llama3.1", "mistral", "mixtral", "codellama", "deepseek-coder", "phi-3", "gemma-2", "qwen2", "yi-34b"] },
    { id: "vllm", name: "vLLM (Self-Hosted)", models: ["llama-3-70b", "mixtral-8x22b", "qwen-72b", "custom-endpoint"] },
    { id: "localai", name: "LocalAI", models: ["llama-3", "mistral", "phi-3", "falcon", "bert-embeddings"] },
    { id: "custom", name: "Custom Endpoint", models: ["custom-model"] }
  ];

  // GET /api/ai/providers - List all available AI providers and models
  app.get("/api/ai/providers", (req, res) => {
    const configured = db.prepare("SELECT * FROM ai_providers").all() as any[];
    res.json({ providers: AI_PROVIDERS, configured });
  });

  // POST /api/ai/providers/configure - Save API key for a provider
  app.post("/api/ai/providers/configure", (req, res) => {
    const { providerId, model, apiKey, endpoint, name } = req.body;
    if (!providerId || !model) {
      return res.status(400).json({ error: "providerId and model are required" });
    }
    const id = `ai-${providerId}-${Date.now()}`;
    const createdAt = new Date().toISOString();
    
    // Disable all other providers of same type
    db.prepare("UPDATE ai_providers SET enabled = 0 WHERE provider = ?").run(providerId);
    
    db.prepare(`INSERT OR REPLACE INTO ai_providers (id, name, provider, model, api_key, endpoint, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)`)
      .run(id, name || providerId, providerId, model, apiKey ? encrypt(apiKey) : null, endpoint || null, createdAt);
    
    // Set active provider in env
    process.env.ACTIVE_AI_PROVIDER = providerId;
    if (apiKey) {
      if (providerId === 'google') process.env.GEMINI_API_KEY = apiKey;
      else process.env[`${providerId.toUpperCase()}_API_KEY`] = apiKey;
    }
    
    db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
      .run(`audit-${Date.now()}`, "USER", "AI_PROVIDER_CONFIGURED",
        `AI provider ${providerId} configured with model ${model}`, createdAt);
    
    res.json({ success: true, id, message: `${providerId} configured successfully` });
  });

  // GET /api/ai/config - Get current AI config
  app.get("/api/ai/config", (req, res) => {
    const active = db.prepare("SELECT * FROM ai_providers WHERE enabled = 1").get() as any;
    res.json({
      configured: !!active,
      provider: active?.provider || "none",
      model: active?.model || "",
      name: active?.name || "",
      apiKey: "",
      deepVerify: process.env.AI_DEEP_VERIFY !== "false",
      autoRemediate: process.env.AI_AUTO_REMEDIATE === "true"
    });
  });

  app.post("/api/ai/config", (req, res) => {
    const { provider, apiKey, deepVerify, autoRemediate, endpoint } = req.body;
    if (provider === 'gemini' && apiKey) process.env.GEMINI_API_KEY = apiKey;
    if (provider === 'openai' && apiKey) process.env.OPENAI_API_KEY = apiKey;
    if (endpoint) process.env.AI_ENDPOINT = endpoint;
    process.env.AI_DEEP_VERIFY = deepVerify ? "true" : "false";
    process.env.AI_AUTO_REMEDIATE = autoRemediate ? "true" : "false";
    process.env.AI_PROVIDER = provider;
    
    db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
      .run(`audit-${Date.now()}`, "USER", "AI_CONFIG_UPDATED", 
        `AI provider set to ${provider}. Deep-Verify: ${deepVerify}, Auto-Remediate: ${autoRemediate}`, 
        new Date().toISOString());
    
    res.json({ success: true, message: "AI configuration updated successfully" });
  });

  // ── Background SSH Metrics Scheduler ──────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    setInterval(updateAllServerMetrics, 30000);
  }

  // ── Vite Integration ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = parseInt(process.env.PORT || "80");
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Saturn Core v4.0.0 running on http://0.0.0.0:${PORT}`);
    console.log(`Neural Engine: ARES 1.0.0`);
    console.log(`SSH Agent ready. Connect to servers via POST /api/ssh/connect`);
  });
}

startServer();
