import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sshAgent, type SSHConnectionConfig, type SystemMetrics } from "./src/lib/ssh-agent.js";
import { ScriptGenerator } from "./src/lib/script-generator.js";
import { ScriptValidator } from "./src/lib/script-validator.js";
import { createAdminRouter } from "./src/lib/admin-router.js";
import { getStatus as getContextPStatus, getContractContent, getIndexContent, getMetricsContent, writeAuditLog, getAuditLogs, getParams, getCpiniContent } from "./src/lib/contextp-service.js";
import { ARESWorker } from "./src/lib/ares-worker.js";
import { initLLMService, getLLMResponse } from "./src/services/llm-service.js";
import { seedDatabase } from "./src/services/database-seed.js";
import { SSHConnectSchema, CommandExecSchema, UserCreateSchema } from "./src/lib/validators.js";
import { z } from "zod";
import { decryptCredential } from "./src/services/credential-service.js";
import { evaluateThresholds } from "./src/services/threshold-engine.js";
import { initSocket, emitServerMetrics } from "./src/services/socket-service.js";
import { connectViaBastion, execViaBastion, disconnectBastion } from "./src/services/bastion-service.js";
import type { ServerDb, UserDb, SshConnectionDb, IncidentDb, ManagedServer, OSType, ScriptRequest } from "./src/lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
const db = new Database("saturn.db");
db.pragma("journal_mode = WAL");

// Encryption key for SSH credentials
if (!process.env.SSH_ENCRYPTION_PEPPER || process.env.SSH_ENCRYPTION_PEPPER === "saturn-default-pepper-change-me") {
  console.error("[SECURITY] SSH_ENCRYPTION_PEPPER environment variable is required and cannot be the default.");
  console.error("[SECURITY] Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  process.exit(1);
}
const ENCRYPTION_KEY = crypto.createHash("sha256").update(process.env.SSH_ENCRYPTION_PEPPER).digest();

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
    tags TEXT,
    cloud_provider TEXT
  );

  CREATE TABLE IF NOT EXISTS threshold_configs (
    serverId TEXT,
    metric TEXT,
    warning REAL,
    critical REAL,
    PRIMARY KEY (serverId, metric)
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
    type TEXT, -- SYSTEM, USER, NEURAL, COMPLIANCE
    event TEXT, -- SSH_CONNECTED, CMD_EXECUTED, CRED_ACCESS
    detail TEXT,
    metadata TEXT, -- JSON blob for compliance tags/info
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

  CREATE TABLE IF NOT EXISTS cloud_credentials (
    id TEXT PRIMARY KEY,
    name TEXT,
    provider TEXT,
    type TEXT,
    encrypted_path TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS process_metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serverId TEXT,
    pid TEXT,
    name TEXT,
    cpu REAL,
    mem REAL,
    timestamp TEXT,
    FOREIGN KEY (serverId) REFERENCES servers(id)
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT,
    language TEXT,
    version TEXT,
    description TEXT,
    path TEXT, -- Path to YAML definition in SKILLS/
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS remediation_configs (
    serverId TEXT PRIMARY KEY, -- 'global' for system-wide
    mode TEXT DEFAULT 'auto', -- auto, skill, manual
    skillId TEXT, -- only if mode is 'skill'
    confidence_threshold REAL DEFAULT 0.7,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS proactive_activities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    skillId TEXT NOT NULL,
    condition TEXT NOT NULL, -- e.g. "cpu > 80"
    schedule TEXT NOT NULL, -- cron or interval
    targetType TEXT NOT NULL, -- servers, groups, all
    targets TEXT, -- JSON array of server IDs or tags
    enabled INTEGER DEFAULT 1,
    last_run DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS skill_assignments (
    id TEXT PRIMARY KEY,
    skillId TEXT NOT NULL,
    targetId TEXT NOT NULL, -- serverId or groupId
    targetType TEXT DEFAULT 'server', -- server or group
    isPreferred INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(skillId, targetId)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TEXT
  );
`);

// Initialize Identity Vault Directories
const VAULT_BASE = 'IDENTITY/credentials_vault';
const providers = ['aws', 'gcp', 'azure', 'onprem', 'providers'];
providers.forEach(p => {
  const dir = path.join(VAULT_BASE, p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
const SKILLS_BASE = 'SKILLS';
const PARAMS_BASE = 'PARAMS';
const skillDirs = ['powershell_remediation_v1', 'bash_remediation_v1', 'custom_skills'];
skillDirs.forEach(d => {
  const dir = path.join(SKILLS_BASE, d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Database initialization handled by seedDatabase in background tasks section.

[SKILLS_BASE, PARAMS_BASE].concat(skillDirs.map(d => path.join(SKILLS_BASE, d))).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(path.join(VAULT_BASE, 'aws/keys'))) fs.mkdirSync(path.join(VAULT_BASE, 'aws/keys'), { recursive: true });

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

// Background metrics updater
let lastProcessUpdate = 0;
async function updateAllServerMetrics() {
  const connections = db.prepare(`
    SELECT sc.*, s.name as serverName 
    FROM ssh_connections sc 
    JOIN servers s ON sc.serverId = s.id 
    WHERE sc.status = 'connected'
  `).all() as any[];
  
  for (const conn of connections) {
    try {
      const key = `${conn.username}@${conn.host}:${conn.port}`;
      const server = db.prepare("SELECT os FROM servers WHERE id = ?").get(conn.serverId) as any;
      const osType = (server?.os === 'windows' ? 'windows' : 'linux') as OSType;
      
      let metrics: SystemMetrics;
      try {
        metrics = await sshAgent.getSystemMetrics(key, osType);
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
        metrics = await sshAgent.getSystemMetrics(key, osType);
      }
      
      const detectedOs = metrics.os.toLowerCase().includes("windows") ? "windows" : "linux";

      db.prepare(`UPDATE servers SET 
        cpu = ?, memory = ?, disk = ?, uptime = ?, os = ?, kernel = ?, 
        load_avg = ?, lastCheck = ?, status = ? WHERE id = ?`)
        .run(
          metrics.cpu, metrics.memory, metrics.disk, metrics.uptime,
          detectedOs, metrics.kernel, JSON.stringify(metrics.loadAvg),
          new Date().toISOString(),
          metrics.cpu > 90 || metrics.memory > 90 ? "degraded" : "online",
          conn.serverId
        );

      db.prepare("UPDATE ssh_connections SET lastConnected = ? WHERE id = ?")
        .run(new Date().toISOString(), conn.id);

      // Evaluate Thresholds (Ticket T-01)
      evaluateThresholds(conn.serverId, conn.serverName, metrics, db);

      // Emit Real-time Metrics (Ticket W-01)
      emitServerMetrics(conn.serverId, {
        cpu: metrics.cpu,
        memory: metrics.memory,
        disk: metrics.disk,
        uptime: metrics.uptime,
        status: metrics.cpu > 90 || metrics.memory > 90 ? "degraded" : "online",
        timestamp: new Date().toISOString()
      });

      // Collect top processes every 5 minutes
      if (Date.now() - lastProcessUpdate > 5 * 60 * 1000) {
        const { script: procScript } = ScriptGenerator.generate({ category: "processes", action: "list", os: osType, params: {} });
        const processResult = await sshAgent.execCommand(key, procScript);
        try {
          const processes = JSON.parse(processResult.stdout);
          const insertProcess = db.prepare("INSERT INTO process_metrics_history (serverId, pid, name, cpu, mem, timestamp) VALUES (?, ?, ?, ?, ?, ?)");
          const nowIso = new Date().toISOString();
          for (const p of (Array.isArray(processes) ? processes : [])) {
             const cpuVal = parseFloat(p.cpu?.toString().replace('%', '') || '0');
             const memVal = parseFloat(p.mem?.toString().replace('%', '') || '0');
             insertProcess.run(conn.serverId, p.pid || '0', p.name || 'unknown', cpuVal, memVal, nowIso);
          }
        } catch (e) {
          console.error(`Failed to parse processes for ${conn.host}`);
        }
      }

    } catch (error: any) {
      console.error(`Failed to update metrics for ${conn.host}:`, error.message);
      db.prepare("UPDATE servers SET status = 'offline', lastCheck = ? WHERE id = ?")
        .run(new Date().toISOString(), conn.serverId);
    }
  }
  if (Date.now() - lastProcessUpdate > 5 * 60 * 1000) {
    lastProcessUpdate = Date.now();
    archiveMetricsToContextP();
  }
}

async function archiveMetricsToContextP() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const servers = db.prepare("SELECT * FROM servers").all() as any[];
  
  for (const s of servers) {
    const history = db.prepare("SELECT name, AVG(cpu) as avg_cpu, AVG(mem) as avg_mem FROM process_metrics_history WHERE serverId = ? AND timestamp > ? GROUP BY name ORDER BY avg_cpu DESC LIMIT 10").all(s.id, yesterday) as any[];
    
    if (history.length > 0) {
      const summary = `### Daily Process Metrics Summary: ${s.name} (${s.ip})
**Period:** ${yesterday} to ${new Date().toISOString()}

| Process | Avg CPU | Avg Mem |
|---------|---------|---------|
${history.map(h => `| ${h.name} | ${h.avg_cpu.toFixed(2)}% | ${h.avg_mem.toFixed(2)}MB |`).join('\n')}

*Data archived for ContextP compliance.*`;

      writeAuditLog({
        id: `METRICS-${s.id}-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: "success",
        domain: "AUDIT",
        title: `Process Metrics Summary - ${s.name}`,
        detail: summary
      });
    }
  }
  
  // Cleanup old metrics (15 days)
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM process_metrics_history WHERE timestamp < ?").run(fifteenDaysAgo);
}

// Seed Data (if empty)
seedDatabase(db);
initLLMService(db);


function logAudit(type: string, event: string, detail: string, metadata: any = {}) {
  const id = `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  db.prepare("INSERT INTO audit_logs (id, type, event, detail, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, type, event, detail, JSON.stringify(metadata), new Date().toISOString());
}

// SATURN-X Validation Middleware (Ticket 1.3)
function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "VALIDATION_ERROR", 
        message: result.error.issues.map(i => i.message).join(", ") 
      });
    }
    req.body = result.data;
    next();
  };
}

// SATURN-X JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

// SATURN-X Auth Middleware (Ticket 1.1)
function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      (req as any).user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

async function startServer() {
  const app = express();
  
  app.use(cors());
  
  // ── SATURN-X Security Headers ─────────────────────────────────────────────
  // Refined CSP to allow Vite modules, Google Fonts, and avoid blocking assets.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        workerSrc: ["'self'", "blob:"],
        upgradeInsecureRequests: null,
      },
    },
    hsts: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
  }));
  
  // ── SATURN-X Rate Limiting ────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: { error: "Too many requests from this IP, please try again after 15 minutes" }
  });
  app.use("/api/", globalLimiter);

  const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 login attempts per minute
    message: { error: "Too many login attempts. Please try again in 1 minute." }
  });

  app.use(express.json({ limit: "1mb" })); // Reduced limit for safety

  // ── Setup & Status ────────────────────────────────────────────────────────
  app.get("/api/setup/status", (req, res) => {
    const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as any;
    const aiCount = db.prepare("SELECT COUNT(*) as c FROM ai_providers WHERE enabled = 1").all().length;
    res.json({ 
      initialized: userCount.c > 0,
      aiConfigured: aiCount > 0
    });
  });

  app.get("/api/health", (req, res) => {
    const sshCount = db.prepare("SELECT COUNT(*) as c FROM ssh_connections WHERE status = 'connected'").get() as any;
    const serverCount = db.prepare("SELECT COUNT(*) as c FROM servers").get() as any;
    console.log("Health check triggered");
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(), 
      version: "0.1.0-FIX",
      cwd: process.cwd(),
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
  app.post("/api/ssh/connect", validate(SSHConnectSchema), async (req, res) => {
    const { 
      host, port = 22, username, privateKey, password,
      bastionHost, bastionPort = 22, bastionUser, bastionKey, bastionPassword 
    } = req.body;
    
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
 
      let testResult;
      
      if (bastionHost) {
        console.log(`[BASTION] Attempting connection to ${host} via ${bastionHost}`);
        const tunnelKey = await connectViaBastion({
            bastionHost, bastionPort, bastionUser, bastionKey, bastionPassword,
            targetHost: host, targetPort: port, targetUser: username, targetKey: privateKey
        });
        
        const bastionResult = await execViaBastion(tunnelKey, "hostname", {
            bastionHost, bastionPort, bastionUser, bastionKey, bastionPassword,
            targetHost: host, targetPort: port, targetUser: username, targetKey: privateKey
        });
        
        testResult = {
            success: bastionResult.code === 0,
            message: bastionResult.code === 0 ? "Connected via Bastion" : `Bastion error: ${bastionResult.stderr}`,
            metrics: {
                hostname: bastionResult.stdout.trim(),
                cpu: 0, memory: 0, disk: 0, uptime: 0, os: "linux", kernel: "unknown", loadAvg: [0,0,0]
            }
        };
      } else {
        testResult = await sshAgent.testConnection(config);
      }
      
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
      logAudit("SYSTEM", "SSH_CONNECTED", `SSH connection established to ${username}@${host}:${port} (${metrics.hostname})`, { compliance_tags: ['GDPR', 'PCI-DSS'] });

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

    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(serverId) as any;
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
    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(id) as any;
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

    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(id) as any;
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
      logAudit("USER", "CMD_EXECUTED", `Command executed on ${conn.host}: ${command.substring(0, 100)}`, { command: command.substring(0, 500) });

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

    const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(id) as any;
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
      logAudit("USER", "SCRIPT_EXECUTED", `Remediation script executed on ${conn.host} (exit: ${result.code})`);

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
    const incidents = db.prepare("SELECT incidents.*, servers.name as serverName FROM incidents JOIN servers ON incidents.serverId = servers.id ORDER BY timestamp DESC").all();
    res.json(incidents);
  });

  app.get("/api/notifications", (req, res) => {
    res.json([]); // Return empty list for now
  });

  app.post("/api/incidents/:id/resolve", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE incidents SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // ── Threshold Configuration (Ticket T-02) ───────────────────────────
  app.get("/api/servers/:id/thresholds", (req, res) => {
    const { id } = req.params;
    const thresholds = db.prepare("SELECT * FROM threshold_configs WHERE serverId = ?").all(id);
    res.json(thresholds);
  });

  app.post("/api/servers/:id/thresholds", (req, res) => {
    const { id } = req.params;
    const { thresholds } = req.body;
    
    if (!Array.isArray(thresholds)) {
      return res.status(400).json({ error: "thresholds must be an array" });
    }
    
    db.prepare("DELETE FROM threshold_configs WHERE serverId = ?").run(id);
    const insert = db.prepare("INSERT INTO threshold_configs (serverId, metric, warning, critical) VALUES (?, ?, ?, ?)");
    for (const t of thresholds) {
      insert.run(id, t.metric, t.warning, t.critical);
    }
    
    res.json({ success: true });
  });

  // ── Cloud Credentials ───────────────────────────────────────────────
  app.get("/api/credentials", (req, res) => {
    const creds = db.prepare("SELECT * FROM cloud_credentials ORDER BY created_at DESC").all();
    res.json(creds);
  });

  app.post("/api/credentials/import", async (req, res) => {
    const { name, provider, type, content, metadata } = req.body;
    if (!name || !provider || !content) return res.status(400).json({ error: "Missing fields" });

    const id = crypto.randomUUID();
    const vaultPath = path.join(VAULT_BASE, provider, `${id}.age`);
    
    // Encryption logic (Simulating 'age' with AES-256-GCM for now)
    const key = crypto.scryptSync(process.env.SATURN_MASTER_KEY || 'saturn-default-secret', 'salt', 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Store as binary: [IV(12)][TAG(16)][DATA(...)]
    const finalData = Buffer.concat([iv, tag, encrypted]);
    fs.writeFileSync(vaultPath, finalData);

    db.prepare(`
      INSERT INTO cloud_credentials (id, name, provider, type, encrypted_path, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, provider, type, vaultPath, JSON.stringify(metadata || {}));

    logAudit('SYSTEM', null, 'CREDENTIAL_IMPORT', `Imported ${provider} credential: ${name}`);
    res.json({ success: true, id });
  });

  app.delete("/api/credentials/:id", (req, res) => {
    const { id } = req.params;
    const cred = db.prepare("SELECT * FROM cloud_credentials WHERE id = ?").get(id) as any;
    if (cred) {
      if (fs.existsSync(cred.encrypted_path)) fs.unlinkSync(cred.encrypted_path);
      db.prepare("DELETE FROM cloud_credentials WHERE id = ?").run(id);
      logAudit('SYSTEM', null, 'CREDENTIAL_REVOKE', `Revoked credential: ${cred.name}`);
    }
    res.json({ success: true });
  });

  app.post("/api/cloud/scan", async (req, res) => {
    const { credId } = req.body;
    const cred = db.prepare("SELECT * FROM cloud_credentials WHERE id = ?").get(credId) as any;
    if (!cred) return res.status(404).json({ error: "Credential not found" });

    let credentials;
    try {
      credentials = decryptCredential(cred.encrypted_path);
    } catch (error: any) {
      return res.status(500).json({ error: `Vault decryption failed: ${error.message}` });
    }

    let discovered: any[] = [];

    try {
      switch (cred.provider) {
        case 'aws': {
          const { EC2Client, DescribeInstancesCommand } = await import('@aws-sdk/client-ec2');
          const client = new EC2Client({
            region: credentials.region || 'us-east-1',
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
            }
          });
          
          const result = await client.send(new DescribeInstancesCommand({}));
          discovered = result.Reservations!.flatMap(r => 
            r.Instances!.map(i => ({
              id: `ec2-${i.InstanceId}`,
              name: i.Tags?.find(t => t.Key === 'Name')?.Value || i.InstanceId,
              ip: i.PublicIpAddress || i.PrivateIpAddress || '0.0.0.0',
              os: i.PlatformDetails?.toLowerCase().includes('windows') ? 'windows' : 'linux',
              provider: 'aws',
              region: credentials.region,
              instanceId: i.InstanceId,
              instanceType: i.InstanceType,
              state: i.State?.Name,
              launchTime: i.LaunchTime?.toISOString()
            }))
          );
          break;
        }
        case 'gcp': {
          const { InstancesClient } = await import('@google-cloud/compute');
          const client = new InstancesClient({
            credentials: {
              client_email: credentials.clientEmail,
              private_key: credentials.privateKey,
            },
            projectId: credentials.projectId,
          });

          const [instances] = await client.list({ project: credentials.projectId, zone: '-' });
          discovered = instances.map(i => ({
            id: `gcp-${i.id}`,
            name: i.name,
            ip: i.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP || 
                i.networkInterfaces?.[0]?.networkIP || '0.0.0.0',
            os: i.disks?.[0]?.licenses?.[0]?.includes('windows') ? 'windows' : 'linux',
            provider: 'gcp',
            zone: i.zone?.split('/').pop(),
            machineType: i.machineType?.split('/').pop(),
            status: i.status?.toLowerCase()
          }));
          break;
        }
        case 'azure': {
          const { ComputeManagementClient } = await import('@azure/arm-compute');
          const { ClientSecretCredential } = await import('@azure/identity');
          
          const azureCred = new ClientSecretCredential(
            credentials.tenantId,
            credentials.clientId,
            credentials.clientSecret
          );
          
          const client = new ComputeManagementClient(azureCred, credentials.subscriptionId);
          const vms = [];
          for await (const vm of client.virtualMachines.listAll()) {
            vms.push({
              id: `azure-${vm.vmId}`,
              name: vm.name,
              ip: '0.0.0.0', // Azure requires Instance Metadata Service or Public IP lookup
              os: vm.storageProfile?.osDisk?.osType?.toLowerCase() || 'linux',
              provider: 'azure',
              location: vm.location,
              vmSize: vm.hardwareProfile?.vmSize,
              status: vm.instanceView?.statuses?.[1]?.displayStatus
            });
          }
          discovered = vms;
          break;
        }
        default:
          return res.status(400).json({ error: `Unsupported provider: ${cred.provider}` });
      }

      // Insert discovered servers
      const insertServer = db.prepare(`INSERT OR IGNORE INTO servers 
        (id, name, ip, os, status, tags) VALUES (?, ?, ?, ?, 'pending', ?)`);

      for (const s of discovered) {
        insertServer.run(s.id, s.name, s.ip, s.os, `${s.provider},${s.region || s.location || s.zone || ''}`);
      }

      logAudit('SYSTEM', 'CLOUD_SCAN', 
        `Scanned ${cred.provider} account - discovered ${discovered.length} instances`);

      res.json({ success: true, discovered: discovered.length, instances: discovered });
    } catch (error: any) {
      logAudit('SYSTEM', 'CLOUD_SCAN_ERROR', `Error scanning ${cred.provider}: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Skills System ───────────────────────────────────────────────────
  app.get("/api/skills", (req, res) => {
    const skills = db.prepare("SELECT * FROM skills WHERE enabled = 1").all();
    res.json(skills);
  });

  app.post("/api/skills/import", (req, res) => {
    const { name, language, version, description, script } = req.body;
    const id = `skill_${Date.now()}`;
    try {
      db.prepare(`INSERT INTO skills (id, name, language, version, description, path, script) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, name, language, version, description, "custom", script || "");
      res.json({ success: true, id });
    } catch (e: any) {
      if (e.message.includes('no such column: script')) {
         // Fallback if db schema doesn't have script column
         db.prepare(`INSERT INTO skills (id, name, language, version, description, path) VALUES (?, ?, ?, ?, ?, ?)`).run(id, name, language, version, description, "custom");
         res.json({ success: true, id, warning: "Saved without script body" });
      } else {
         res.status(500).json({ error: e.message });
      }
    }
  });

  // Seed default skills if empty
  const existingSkills = db.prepare("SELECT COUNT(*) as c FROM skills").get() as any;
  if (existingSkills.c === 0) {
    db.prepare(`INSERT INTO skills (id, name, language, version, description, path) VALUES (?, ?, ?, ?, ?, ?)`)
      .run('ps_remediation_v1', 'PowerShell Remediation Expert', 'powershell', '1.0', 'Expert in Windows Server remediation', 'SKILLS/powershell_remediation_v1/skill.yaml');
    db.prepare(`INSERT INTO skills (id, name, language, version, description, path) VALUES (?, ?, ?, ?, ?, ?)`)
      .run('bash_remediation_v1', 'Bash Linux Remediation', 'bash', '1.0', 'Expert in Linux system recovery', 'SKILLS/bash_remediation_v1/skill.yaml');
  }

  // ── Remediation Modes ───────────────────────────────────────────────
  app.get("/api/remediation/config", (req, res) => {
    const configs = db.prepare("SELECT * FROM remediation_configs").all();
    res.json(configs);
  });

  app.post("/api/remediation/config", (req, res) => {
    const { serverId, mode, skillId, threshold } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO remediation_configs (serverId, mode, skillId, confidence_threshold, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(serverId || 'global', mode, skillId || null, threshold || 0.7);
    res.json({ success: true });
  });

  // Seed global config
  const globalCheck = db.prepare("SELECT COUNT(*) as c FROM remediation_configs WHERE serverId = 'global'").get() as any;
  if (globalCheck.c === 0) {
    db.prepare("INSERT INTO remediation_configs (serverId, mode, confidence_threshold) VALUES ('global', 'auto', 0.7)").run();
  }

  app.post("/api/skills/generate", async (req, res) => {
    const { skillId, prompt, serverId, forceManual = false } = req.body;
    
    // Resolve Mode and Skill
    const globalConfig = db.prepare("SELECT * FROM remediation_configs WHERE serverId = 'global'").get() as any;
    const serverConfig = db.prepare("SELECT * FROM remediation_configs WHERE serverId = ?").get(serverId) as any;
    const activeConfig = serverConfig || globalConfig;
    
    let targetSkillId = skillId;
    if (!targetSkillId) {
      targetSkillId = activeConfig.mode === 'skill' ? activeConfig.skillId : 'ps_remediation_v1'; // Default if auto
    }

    const skill = db.prepare("SELECT * FROM skills WHERE id = ?").get(targetSkillId) as any;
    if (!skill) return res.status(404).json({ error: "Skill not found" });

    const server = db.prepare("SELECT * FROM servers WHERE id = ?").get(serverId) as any;
    const skillDef = fs.readFileSync(skill.path, 'utf8');
    
    const enhancedPrompt = `
      INSTRUCCIÓN: ${prompt}
      SKILL: ${skillDef}
      SERVER: ${JSON.stringify(server)}
      
      REGLAS AUTÓNOMAS:
      1. Genera el script completo.
      2. Calcula un nivel de confianza (0.0 a 1.0) basado en la precisión del remedio.
      3. Identifica si el script contiene comandos peligrosos (peligro: true/false).
      4. Formato de respuesta JSON: { "script": "...", "confidence": 0.95, "dangerous": false, "explanation": "..." }
    `;

    try {
      let result: any = {};
      let attempts = 0;
      const maxAttempts = 3;
      let currentPrompt = enhancedPrompt;

      while (attempts < maxAttempts) {
        attempts++;
        const response = await getLLMResponse('gemini', currentPrompt);
        result = JSON.parse(response.replace(/```json/g, '').replace(/```/g, ''));
        
        // Validation
        const validation = ScriptValidator.validate(result.script, skill.language);
        if (validation.success) {
          result.validation = { status: 'passed', errors: [] };
          break;
        } else {
          result.validation = { status: 'failed', errors: validation.errors };
          if (attempts < maxAttempts) {
            currentPrompt = `
              EL SCRIPT ANTERIOR TIENE ERRORES DE VALIDACIÓN. POR FAVOR CORRÍGELO.
              ERRORES:
              ${validation.errors.join('\n')}
              
              SCRIPT ORIGINAL:
              ${result.script}
              
              RESPONDE SOLO CON EL JSON CORREGIDO.
            `;
          }
        }
      }
      
      // Autonomous Execution Logic
      let status = "pending_approval";
      const threshold = activeConfig.confidence_threshold || 0.7;
      if (!forceManual && activeConfig.mode !== 'manual' && result.confidence >= threshold && !result.dangerous && result.validation.status === 'passed') {
        status = "executing_autonomously";
        logAudit("SYSTEM", "AUTO_REMEDIATION", `Executing autonomous fix for ${serverId} using ${skill.name}`, { confidence: result.confidence, validation: result.validation });
      }

      res.json({ success: true, ...result, status, skill: skill.name });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // ── Proactive Activities ───────────────────────────────────────────
  app.get("/api/proactive", (req, res) => {
    const activities = db.prepare("SELECT * FROM proactive_activities").all();
    res.json(activities);
  });

  app.post("/api/proactive", (req, res) => {
    const { id, name, skillId, condition, schedule, targetType, targets, enabled } = req.body;
    const actId = id || crypto.randomUUID();
    db.prepare(`
      INSERT OR REPLACE INTO proactive_activities (id, name, skillId, condition, schedule, targetType, targets, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(actId, name, skillId, condition, schedule, targetType, JSON.stringify(targets), enabled ? 1 : 0);
    res.json({ success: true, id: actId });
  });

  app.delete("/api/proactive/:id", (req, res) => {
    db.prepare("DELETE FROM proactive_activities WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // ── Skill Assignments ───────────────────────────────────────────────
  app.get("/api/skills/assignments", (req, res) => {
    const assignments = db.prepare("SELECT * FROM skill_assignments").all();
    res.json(assignments);
  });

  app.post("/api/skills/assignments", (req, res) => {
    const { skillId, targetId, targetType, isPreferred } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO skill_assignments (id, skillId, targetId, targetType, isPreferred)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), skillId, targetId, targetType || 'server', isPreferred ? 1 : 0);
    res.json({ success: true });
  });

  // ── ContextP Explorer ───────────────────────────────────────────────
  app.get("/api/contextp/files", (req, res) => {
    const getFiles = (dir: string): any[] => {
      let results: any[] = [];
      if (!fs.existsSync(dir)) return [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results.push({ name: file, path: filePath, type: 'dir', children: getFiles(filePath) });
        } else {
          results.push({ name: file, path: filePath, type: 'file', size: stat.size, mtime: stat.mtime });
        }
      });
      return results;
    };
    try {
      const tree = [
        { name: 'SKILLS', type: 'dir', children: getFiles('SKILLS') },
        { name: 'PARAMS', type: 'dir', children: getFiles('PARAMS') },
        { name: 'IDENTITY', type: 'dir', children: getFiles('IDENTITY') },
        { name: 'AUDIT', type: 'dir', children: getFiles('AUDIT') }
      ];
      res.json(tree);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/contextp/read", (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath || filePath.includes('..')) return res.status(400).json({ error: "Invalid path" });
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ content });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/notifications/config", (req, res) => {
    const { type, destination, config, enabled } = req.body;
    const id = `notif-${Date.now()}`;
    db.prepare("INSERT OR REPLACE INTO notification_configs (id, type, destination, config, enabled) VALUES (?, ?, ?, ?, ?)")
      .run(id, type, destination, JSON.stringify(config), enabled ? 1 : 0);
    res.json({ id, success: true });
  });

  app.get("/api/notifications", (req, res) => {
    const configs = db.prepare("SELECT * FROM notification_configs").all();
    res.json(configs.map((c: any) => ({
      ...c,
      config: c.config ? JSON.parse(c.config) : {}
    })));
  });

  app.get("/api/audit", (req, res) => {
    const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").all();
    res.json(logs.map((l: any) => ({
      ...l,
      metadata: l.metadata ? JSON.parse(l.metadata) : {}
    })));
  });

  app.get("/api/obpa/pending", (req, res) => {
    const pending = db.prepare("SELECT * FROM obpa_cycles WHERE status = 'pending'").all();
    res.json(pending);
  });

  app.post("/api/obpa/approve", async (req, res) => {
    const { obpaId, approved } = req.body;
    const cycle = db.prepare("SELECT * FROM obpa_cycles WHERE id = ?").get(obpaId) as any;
    if (!cycle) return res.status(404).json({ error: "Cycle not found" });

    if (approved) {
      db.prepare("UPDATE obpa_cycles SET status = 'approved' WHERE id = ?").run(obpaId);
      db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "USER", "REMEDIATION_APPROVED", `User approved remediation for incident ${cycle.incidentId}`, new Date().toISOString());
      
      // Execute remediation script via SSH if we have a connection
      const incident = db.prepare("SELECT * FROM incidents WHERE id = ?").get(cycle.incidentId) as any;
      if (incident) {
        const sshConn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(incident.serverId) as any;
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
    
    // Wake up ARES immediately
    aresWorker.wakeUp().catch(console.error);

    res.json({ id, status: "open" });
  });

  // Neural Core: OBPA Cycle with SSH context
  app.post("/api/neural/analyze", async (req, res) => {
    const { incidentId, provider = 'gemini' } = req.body;
    const incident = db.prepare("SELECT * FROM incidents WHERE id = ?").get(incidentId) as IncidentDb | undefined;
    
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    
    const server = db.prepare("SELECT * FROM servers WHERE id = ?").get(incident.serverId) as ServerDb | undefined;
    
    if (!incident || !server) return res.status(404).json({ error: "Not found" });

    try {
      // Get SSH real-time metrics if available
      let realTimeMetrics = "";
      const sshConn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ? AND status = 'connected'").get(server.id) as any;
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

  // ── Seed default admin user (if no users exist) ────────────────────────────
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c === 0) {
    const defaultUsername = "admin";
    const defaultPassword = "saturn2024";
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(defaultPassword, salt, 100000, 64, "sha512").toString("hex");
    const passwordHash = `${salt}:${hash}`;
    db.prepare("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
      .run("user-default", defaultUsername, passwordHash, "admin", new Date().toISOString());
    console.log(`Default admin user created: ${defaultUsername} / ${defaultPassword}`);
  }

  // ── Admin User Creation ────────────────────────────────────────────────────
  app.post("/api/admin/create", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 8) {
      return res.status(400).json({ error: "Username required and password must be at least 8 characters" });
    }
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as any;
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }
    const id = `user-${Date.now()}`;
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    const passwordHash = `${salt}:${hash}`;
    const createdAt = new Date().toISOString();
    db.prepare("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, username, passwordHash, "admin", createdAt);
    db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
      .run(`audit-${Date.now()}`, "USER", "ADMIN_CREATED", `Admin user ${username} created`, createdAt);
    res.json({ success: true, id, message: "Admin user created successfully" });
  });

  // ── Server Logs ────────────────────────────────────────────────────────────
  app.get("/api/servers/:id/logs", async (req, res) => {
    const { id } = req.params;
    const { lines, service } = req.query;
    try {
      const conn = db.prepare("SELECT * FROM ssh_connections WHERE serverId = ?").get(id) as SshConnectionDb | undefined;
      if (!conn) return res.status(404).json({ error: "No SSH connection for this server" });

      const server = db.prepare("SELECT os FROM servers WHERE id = ?").get(id) as ServerDb | undefined;
      const osType = (server?.os === 'windows' ? 'windows' : 'linux') as OSType;
      
      const key = `${conn.username}@${conn.host}:${conn.port}`;
      const scriptReq: ScriptRequest = {
        category: "logs",
        action: "get",
        os: osType,
        params: { lines: lines || 50, service }
      };

      const { script } = ScriptGenerator.generate(scriptReq);
      const result = await sshAgent.execCommand(key, script);
      
      res.json({ logs: result.stdout });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Resource Lists & Actions are handled by AdminRouter ─────────────────────

  // ── User Management ────────────────────────────────────────────────────────
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role, created_at FROM users").all();
    res.json(users);
  });

  app.delete("/api/admin/users/:id", (req, res) => {
    const { id } = req.params;
    const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
    if (userCount.c <= 1) {
      return res.status(400).json({ error: "Cannot delete the last admin user" });
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
      .run(`audit-${Date.now()}`, "USER", "USER_DELETED", `User ${id} deleted`, new Date().toISOString());
    res.json({ success: true });
  });

  // ── Reset Users - BLOCKED as per SATURN-X Protocol (Ticket 1.1) ──────────
  app.post("/api/admin/reset-users", (req, res) => {
    res.status(403).json({ error: "SECURITY_BLOCK", message: "This operation is restricted to direct console access only." });
  });

  // ── Global User Creation ───────────────────────────────────────────────────
  app.post("/api/admin/create-user", validate(UserCreateSchema), (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    
    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    const passwordHash = `${salt}:${hash}`;
    const createdAt = new Date().toISOString();

    try {
      db.prepare("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(id, username, passwordHash, role || 'admin', createdAt);
      
      db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "USER", "USER_CREATED", `Global user ${username} created by system`, createdAt);
      
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── AI Providers & Models (2026 comprehensive list - 50+ providers) ────
  const AI_PROVIDERS = [
    // ═══ FRONTIER PROVIDERS (Top Tier - proprietary models) ═══
    { id: "openai", name: "OpenAI", tier: "frontier", models: ["gpt-5", "gpt-5-mini", "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o1", "o1-mini", "o3-mini", "o4", "codex"] },
    { id: "anthropic", name: "Anthropic", tier: "frontier", models: ["claude-4.7", "claude-4.6", "claude-4-opus", "claude-4-sonnet", "claude-3.5-sonnet", "claude-3.5-haiku", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku"] },
    { id: "google", name: "Google AI (Gemini)", tier: "frontier", models: ["gemini-3-pro", "gemini-3-flash", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash", "gemma-3-27b", "gemma-3-12b", "gemma-2-27b"] },
    { id: "xai", name: "xAI (Grok)", tier: "frontier", models: ["grok-3", "grok-3-mini", "grok-2", "grok-2-mini", "grok-1.5", "grok-1"] },
    { id: "meta", name: "Meta (Llama)", tier: "frontier", models: ["llama-4-405b", "llama-4-90b", "llama-4-70b", "llama-4-8b", "llama-3.1-405b", "llama-3.1-70b", "llama-3.1-8b", "llama-3-70b", "llama-3-8b", "llama-guard-3"] },

    // ═══ HYPERSCALERS & AGGREGATORS (multi-model APIs) ═══
    { id: "azure", name: "Microsoft Azure AI", tier: "hyperscaler", models: ["gpt-5-azure", "gpt-4o-azure", "gpt-4-turbo-azure", "o1-azure", "ma-voice", "ma-image", "ma-transcribe"] },
    { id: "aws", name: "Amazon AWS Bedrock", tier: "hyperscaler", models: ["claude-4-sonnet-bedrock", "claude-3.5-sonnet-bedrock", "llama-4-70b-bedrock", "mistral-large-bedrock", "titan-text-lite", "titan-embedding"] },
    { id: "gcp", name: "GCP Vertex AI", tier: "hyperscaler", models: ["gemini-3-pro-vertex", "gemini-2.5-pro-vertex", "claude-4-sonnet-vertex", "llama-4-70b-vertex", "mistral-large-vertex"] },
    { id: "openrouter", name: "OpenRouter (Multi-Proxy)", tier: "aggregator", models: ["openai/gpt-4o", "anthropic/claude-4-sonnet", "google/gemini-2.5-pro", "meta-llama/llama-4-70b", "mistralai/mistral-large", "deepseek/deepseek-v3", "qwen/qwen-110b"] },

    // ═══ HIGH-PERFORMANCE INFERENCE PROVIDERS ═══
    { id: "groq", name: "Groq (Ultra-Fast)", tier: "inference", models: ["llama-4-70b-groq", "llama-4-8b-groq", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it", "llama-guard-3-8b"] },
    { id: "together", name: "Together AI", tier: "inference", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x22b", "deepseek-coder-33b", "qwen-110b", "qwen-72b", "yi-34b"] },
    { id: "fireworks", name: "Fireworks AI", tier: "inference", models: ["llama-4-70b", "llama-v3-70b", "mixtral-8x7b", "deepseek-coder-33b", "qwen-72b-chat", "yi-34b"] },
    { id: "deepinfra", name: "DeepInfra", tier: "inference", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x22b", "codellama-34b", "mistral-7b"] },

    // ═══ VALUE PROVIDERS (cost-effective) ═══
    { id: "deepseek", name: "DeepSeek", tier: "value", models: ["deepseek-v4", "deepseek-v3", "deepseek-r1", "deepseek-coder-v2", "deepseek-chat", "deepseek-coder", "deepseek-v2"] },
    { id: "mistral", name: "Mistral AI", tier: "value", models: ["mistral-large-2", "mistral-medium", "mistral-small", "mixtral-8x22b", "mixtral-8x7b", "codestral", "ministral-8b", "ministral-3b"] },
    { id: "cohere", name: "Cohere", tier: "value", models: ["command-r-plus", "command-r", "command-a", "command-light", "aya-23", "embed-english-v3", "embed-multilingual-v3", "rerank-v3"] },
    { id: "perplexity", name: "Perplexity AI", tier: "value", models: ["pplx-70b", "pplx-8b", "sonar-pro", "sonar-small", "mixtral-8x7b-instruct", "llama-3-sonar-large"] },

    // ═══ ASIAN ECOSYSTEM ═══
    { id: "alibaba", name: "Alibaba (Qwen / DashScope)", tier: "asia", models: ["qwen-3-110b", "qwen-3-72b", "qwen-3-32b", "qwen-2.5-72b", "qwen-2.5-32b", "qwen-110b", "qwen-72b", "qwen-32b", "qwen-14b", "qwen-7b"] },
    { id: "baidu", name: "Baidu (ERNIE)", tier: "asia", models: ["ernie-4.5", "ernie-4.0", "ernie-3.5", "ernie-bot-turbo", "ernie-lite", "ernie-speed"] },
    { id: "tencent", name: "Tencent (Hunyuan)", tier: "asia", models: ["hunyuan-large", "hunyuan-standard", "hunyuan-lite", "hunyuan-code"] },
    { id: "zhipu", name: "Zhipu AI (GLM)", tier: "asia", models: ["glm-5", "glm-4", "glm-4v", "glm-4-plus", "glm-3-turbo", "glm-4v-plus"] },
    { id: "minimax", name: "MiniMax", tier: "asia", models: ["minimax-abab-7", "minimax-abab-6.5", "minimax-abab-5.5", "minimax-abab-5"] },
    { id: "moonshot", name: "Moonshot AI (Kimi)", tier: "asia", models: ["kimi-k2", "kimi-k1.5", "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"] },
    { id: "stepfun", name: "StepFun (Step)", tier: "asia", models: ["step-3", "step-2", "step-1v", "step-1"] },
    { id: "01ai", name: "01.AI (Yi)", tier: "asia", models: ["yi-large", "yi-medium", "yi-vision", "yi-34b", "yi-9b", "yi-6b"] },

    // ═══ SPECIALIZED / NICHE ═══
    { id: "nvidia", name: "NVIDIA NIM", tier: "specialized", models: ["llama-4-70b-nim", "mixtral-8x22b-nim", "nemotron-4-340b", "nemotron-mini"] },
    { id: "ibm", name: "IBM Watsonx", tier: "specialized", models: ["granite-3-13b", "granite-3-8b", "granite-3-3b", "granite-13b", "granite-8b", "llama-4-70b-watsonx"] },
    { id: "huggingface", name: "Hugging Face Inference", tier: "specialized", models: ["mistral-7b", "llama-3-8b", "falcon-7b", "zephyr-7b", "codellama-34b", "phi-3", "phi-4", "qwen2-72b", "starcoder2"] },
    { id: "replicate", name: "Replicate", tier: "specialized", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x7b", "stable-diffusion-3.5", "flux-pro", "whisper", "musicgen"] },
    { id: "stability", name: "Stability AI", tier: "specialized", models: ["stable-diffusion-3.5", "stable-diffusion-3", "sd-xl", "stable-audio"] },
    { id: "elevenlabs", name: "ElevenLabs", tier: "specialized", models: ["eleven-multilingual-v2", "eleven-turbo-v2", "eleven-monolingual-v1"] },

    // ═══ SELF-HOSTED / LOCAL ═══
    { id: "ollama", name: "Ollama (Local)", tier: "selfhosted", models: ["llama4", "llama3.2", "llama3.1", "llama3", "mistral", "mixtral", "codellama", "deepseek-coder", "deepseek-r1", "phi-4", "phi-3", "gemma-3", "gemma-2", "qwen2.5", "qwen2", "yi-34b", "falcon2", "starcoder2", "nemotron-mini"] },
    { id: "vllm", name: "vLLM (Self-Hosted)", tier: "selfhosted", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x22b", "qwen-110b", "qwen-72b", "deepseek-v3", "custom-endpoint"] },
    { id: "localai", name: "LocalAI", tier: "selfhosted", models: ["llama-4", "llama-3", "mistral", "phi-4", "phi-3", "falcon", "bert-embeddings", "whisper", "stable-diffusion", "text-to-speech"] },
    { id: "lmstudio", name: "LM Studio", tier: "selfhosted", models: ["lm-studio-default", "custom-local-model"] },
    { id: "textgen", name: "Oobabooga TextGen", tier: "selfhosted", models: ["textgen-default", "custom-textgen-model"] },
    { id: "kobold", name: "KoboldCPP", tier: "selfhosted", models: ["kobold-default", "custom-kobold-model"] },
    { id: "tabbyapi", name: "TabbyAPI", tier: "selfhosted", models: ["tabby-default", "custom-tabby-model"] },
    { id: "custom", name: "Custom Endpoint (OpenAI-compatible)", tier: "selfhosted", models: ["custom-model"] }
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

  // ── ContextP Integration (OBPA Methodology) ───────────────────────────────

  // GET /api/contextp/status - SHOW STATUS command
  app.get("/api/contextp/status", (req, res) => {
    const status = getContextPStatus();
    res.json(status);
  });

  // GET /api/contextp/cpini - Read cpini.md
  app.get("/api/contextp/cpini", (req, res) => {
    const content = getCpiniContent();
    res.json({ content, exists: !!content });
  });

  // GET /api/contextp/contracts - SHOW CONTRACTS command
  app.get("/api/contextp/contracts", (req, res) => {
    const contracts = ["ROOT_CONTRACT", "TECH_CONTRACT", "FUNC_CONTRACT", "STRUCT_CONTRACT", "AUDIT_CONTRACT"];
    const result = contracts.map(name => ({
      name,
      content: getContractContent(name),
      exists: !!getContractContent(name)
    }));
    res.json(result);
  });

  // GET /api/contextp/contract/:name - Get specific contract
  app.get("/api/contextp/contract/:name", (req, res) => {
    const { name } = req.params;
    const content = getContractContent(name.toUpperCase().replace(/-/g, "_"));
    if (!content) return res.status(404).json({ error: "Contract not found" });
    res.json({ name, content });
  });

  // GET /api/contextp/index - Read INDEX_MASTER.md
  app.get("/api/contextp/index", (req, res) => {
    const content = getIndexContent();
    res.json({ content, exists: !!content });
  });

  // GET /api/contextp/metrics - Read METRICS_MASTER.md
  app.get("/api/contextp/metrics", (req, res) => {
    const content = getMetricsContent();
    res.json({ content, exists: !!content });
  });

  // GET /api/contextp/audit - Get audit logs
  app.get("/api/contextp/audit", (req, res) => {
    const logs = getAuditLogs();
    res.json(logs);
  });

  // POST /api/contextp/audit - Write audit log entry
  app.post("/api/contextp/audit", (req, res) => {
    const { id, date, type, domain, title, detail } = req.body;
    if (!id || !type || !domain || !title) {
      return res.status(400).json({ error: "id, type, domain, and title are required" });
    }
    const success = writeAuditLog({
      id,
      date: date || new Date().toISOString().split("T")[0],
      type,
      domain,
      title,
      detail: detail || ""
    });
    res.json({ success });
  });

  // GET /api/contextp/params - Read PARAMS
  app.get("/api/contextp/params", (req, res) => {
    const params = getParams();
    res.json(params);
  });

  // GET /api/contextp/patterns - SHOW PATTERNS command
  app.get("/api/contextp/patterns", (req, res) => {
    const status = getContextPStatus();
    res.json(status.patterns);
  });

  // GET /api/contextp/debt - SHOW DEBT command
  app.get("/api/contextp/debt", (req, res) => {
    const status = getContextPStatus();
    res.json(status.technicalDebt);
  });

  // ── Admin Login (JWT Implementation) ──────────────────────────────────────
  app.post("/api/admin/login", loginLimiter, (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserDb | undefined;
    
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    
    const [salt, hash] = user.password_hash.split(":");
    const loginHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    
    if (loginHash !== hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "8h" });
    
    logAudit("USER", "LOGIN_SUCCESS", `User ${username} logged in`);
    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
  });

  // ── Protected Routes (Ticket 1.1) ──────────────────────────────────────────
  app.use("/api/admin", authenticateJWT);
  app.use("/api/contextp", authenticateJWT);
  app.use("/api/neural", authenticateJWT);
  app.use("/api/ssh", authenticateJWT);

  // ── Fase 2: Admin Router (Server Administration) ──────────────────────────
  const adminRouter = createAdminRouter(db, sshAgent, ScriptGenerator, decrypt);
  app.use(adminRouter);

  // ── ARES Neural Core Worker ───────────────────────────────────────────────
  const aresWorker = new ARESWorker(db, sshAgent);
  aresWorker.start(60000);

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
    app.get("*", (req, res, next) => {
      // Don't intercept API routes - let them 404 naturally
      if (req.path.startsWith("/api/")) return next();
      res.setHeader('Content-Type', 'text/html');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = parseInt(process.env.PORT || (process.env.NODE_ENV === "production" ? "80" : "3000"));
  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Saturn Core v0.1.0-FIX running on http://0.0.0.0:${PORT} (NODE_ENV: ${process.env.NODE_ENV})`);
    console.log(`Neural Engine: ARES 1.0.0`);
    console.log(`SSH Agent ready. Connect to servers via POST /api/ssh/connect`);
    console.log(`WebSocket Server: Active and listening on port ${PORT}`);
  });
}

startServer();
