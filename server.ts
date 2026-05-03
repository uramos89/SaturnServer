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
import { createAdminRouter as createLibAdminRouter } from "./src/lib/admin-router.js";
import {
  getStatus as getContextPStatus,
  getContractContent,
  getIndexContent,
  getMetricsContent,
  writeAuditLog,
  getAuditLogs,
  getParams,
  getCpiniContent,
} from "./src/lib/contextp-service.js";
import { ARESWorker } from "./src/lib/ares-worker.js";
import { initLLMService, getLLMResponse, initDualProviders } from "./src/services/llm-service.js";
import { seedDatabase } from "./src/services/database-seed.js";
import { SSHConnectSchema, CommandExecSchema, UserCreateSchema } from "./src/lib/validators.js";
import { z } from "zod";
import { decryptCredential } from "./src/services/credential-service.js";
import { evaluateThresholds } from "./src/services/threshold-engine.js";
import { initSocket, emitServerMetrics } from "./src/services/socket-service.js";
import { connectViaBastion, execViaBastion, disconnectBastion } from "./src/services/bastion-service.js";
import type {
  ServerDb,
  UserDb,
  SshConnectionDb,
  IncidentDb,
  ManagedServer,
  OSType,
  ScriptRequest,
} from "./src/lib/types.js";
import { JWT_SECRET, logAudit, encryptCredential, decryptCredential as decryptHelper } from "./src/lib/server-helpers.js";

// ── Route factories ────────────────────────────────────────────────────
import { createAuthRouter } from "./src/routes/auth.js";
import { createSetupRouter } from "./src/routes/setup.js";
import { createServersRouter } from "./src/routes/servers.js";
import { createIncidentsRouter } from "./src/routes/incidents.js";
import { createNotificationsRouter } from "./src/routes/notifications.js";
import { createSkillsRouter } from "./src/routes/skills.js";
import { createAiRouter } from "./src/routes/ai.js";
import { createThresholdsRouter } from "./src/routes/thresholds.js";
import { createProactiveRouter } from "./src/routes/proactive.js";
import { createCloudRouter } from "./src/routes/cloud.js";
import { createNeuralRouter } from "./src/routes/neural.js";
import { createContextpRouter } from "./src/routes/contextp.js";
import { createComplianceRouter } from "./src/routes/compliance.js";
import { createAdminRouter as createAdminUsersRouter } from "./src/routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Initialize Database ────────────────────────────────────────────────
const db = new Database("saturn.db");
db.pragma("journal_mode = WAL");

// ── Security check ─────────────────────────────────────────────────────
if (
  !process.env.SSH_ENCRYPTION_PEPPER ||
  process.env.SSH_ENCRYPTION_PEPPER === "saturn-default-pepper-change-me"
) {
  console.error(
    "[SECURITY] SSH_ENCRYPTION_PEPPER environment variable is required and cannot be the default."
  );
  console.error(
    '[SECURITY] Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
  process.exit(1);
}

// ── Local encryption (AES-256-CBC for credential storage) ──────────────
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(process.env.SSH_ENCRYPTION_PEPPER)
  .digest();

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

// ── Database Schema ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY, name TEXT, ip TEXT, os TEXT, status TEXT,
    cpu REAL, memory REAL, disk REAL, uptime INTEGER, kernel TEXT,
    load_avg TEXT, lastCheck TEXT, tags TEXT, cloud_provider TEXT
  );
  CREATE TABLE IF NOT EXISTS threshold_configs (
    serverId TEXT, metric TEXT, warning REAL, critical REAL,
    PRIMARY KEY (serverId, metric)
  );
  CREATE TABLE IF NOT EXISTS ssh_connections (
    id TEXT PRIMARY KEY, serverId TEXT UNIQUE, host TEXT NOT NULL,
    port INTEGER DEFAULT 22, username TEXT NOT NULL, authType TEXT DEFAULT 'key',
    encryptedKey TEXT, encryptedPassword TEXT, fingerprint TEXT,
    lastConnected TEXT, status TEXT DEFAULT 'disconnected',
    FOREIGN KEY (serverId) REFERENCES servers(id)
  );
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY, serverId TEXT, severity TEXT, title TEXT,
    description TEXT, status TEXT, timestamp TEXT, resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS obpa_cycles (
    id TEXT PRIMARY KEY, incidentId TEXT, phase TEXT, observation TEXT,
    proposal TEXT, remediation_script TEXT, execution_result TEXT,
    consolidated_knowledge TEXT, confidence REAL, status TEXT DEFAULT 'pending',
    timestamp TEXT
  );
  CREATE TABLE IF NOT EXISTS contextp_entries (
    path TEXT PRIMARY KEY, content TEXT, type TEXT, lastUpdated TEXT
  );
  CREATE TABLE IF NOT EXISTS notification_configs (
    id TEXT PRIMARY KEY, type TEXT, destination TEXT, config TEXT, enabled INTEGER
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, type TEXT, event TEXT, detail TEXT,
    metadata TEXT, timestamp TEXT
  );
  CREATE TABLE IF NOT EXISTS command_history (
    id TEXT PRIMARY KEY, serverId TEXT, command TEXT, stdout TEXT,
    stderr TEXT, exitCode INTEGER, executedBy TEXT, timestamp TEXT
  );
  CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, provider TEXT NOT NULL,
    model TEXT NOT NULL, api_key TEXT, endpoint TEXT, enabled INTEGER DEFAULT 0,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS cloud_credentials (
    id TEXT PRIMARY KEY, name TEXT, provider TEXT, type TEXT,
    encrypted_path TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS process_metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, serverId TEXT, pid TEXT,
    name TEXT, cpu REAL, mem REAL, timestamp TEXT,
    FOREIGN KEY (serverId) REFERENCES servers(id)
  );
  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY, name TEXT, language TEXT, version TEXT,
    description TEXT, path TEXT, enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS remediation_configs (
    serverId TEXT PRIMARY KEY, mode TEXT DEFAULT 'auto',
    skillId TEXT, confidence_threshold REAL DEFAULT 0.7,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS proactive_activities (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, skillId TEXT NOT NULL,
    condition TEXT NOT NULL, schedule TEXT NOT NULL,
    targetType TEXT NOT NULL, targets TEXT, enabled INTEGER DEFAULT 1,
    last_run DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS proactive_execution_history (
    id TEXT PRIMARY KEY, activityId TEXT NOT NULL, activityName TEXT,
    serverId TEXT, condition TEXT, conditionMet INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', script TEXT, output TEXT, error TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activityId) REFERENCES proactive_activities(id)
  );
  CREATE TABLE IF NOT EXISTS aegis_cache (
    cache_key TEXT PRIMARY KEY, skill_script TEXT, skill_metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, ttl_minutes INTEGER DEFAULT 60
  );
  CREATE TABLE IF NOT EXISTS aegis_generations (
    id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, server_id TEXT,
    iteration INTEGER DEFAULT 1, skill_id TEXT, status TEXT DEFAULT 'generated',
    prompt_sent TEXT, prompt_used TEXT, confidence REAL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS aegis_feedback (
    id TEXT PRIMARY KEY, skill_id TEXT NOT NULL, incident_id TEXT,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5), comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS skill_assignments (
    id TEXT PRIMARY KEY, skillId TEXT NOT NULL, targetId TEXT NOT NULL,
    targetType TEXT DEFAULT 'server', isPreferred INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(skillId, targetId)
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, role TEXT DEFAULT 'admin', created_at TEXT
  );
`);

// ── Identity Vault Directories ──────────────────────────────────────────
const VAULT_BASE = "IDENTITY/credentials_vault";
const providers = ["aws", "gcp", "azure", "onprem", "providers"];
providers.forEach((p) => {
  const dir = path.join(VAULT_BASE, p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
const SKILLS_BASE = "SKILLS";
const skillDirs = ["powershell_remediation_v1", "bash_remediation_v1", "custom_skills"];
skillDirs.forEach((d) => {
  const dir = path.join(SKILLS_BASE, d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
[SKILLS_BASE]
  .concat(skillDirs.map((d) => path.join(SKILLS_BASE, d)))
  .forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
if (!fs.existsSync(path.join(VAULT_BASE, "aws/keys")))
  fs.mkdirSync(path.join(VAULT_BASE, "aws/keys"), { recursive: true });

// ── Column migrations (safe) ───────────────────────────────────────────
try {
  db.exec("ALTER TABLE servers ADD COLUMN disk REAL");
} catch {}
try {
  db.exec("ALTER TABLE servers ADD COLUMN uptime INTEGER");
} catch {}
try {
  db.exec("ALTER TABLE servers ADD COLUMN kernel TEXT");
} catch {}
try {
  db.exec("ALTER TABLE servers ADD COLUMN load_avg TEXT");
} catch {}
try {
  db.exec("ALTER TABLE skills ADD COLUMN script TEXT");
} catch {}

// ── Notification Service ───────────────────────────────────────────────
async function sendNotification(
  type: string,
  title: string,
  message: string,
  severity: string
) {
  try {
    const { sendNotification: sendModular } = await import(
      "./src/services/notification-service.js"
    );
    await sendModular(db as any, type, title, message, severity);
  } catch (e: any) {
    const configs = db
      .prepare("SELECT * FROM notification_configs WHERE enabled = 1")
      .all() as any[];
    for (const config of configs) {
      try {
        if (config.type === "webhook" || config.type === "slack") {
          const axios = (await import("axios")).default;
          await axios.post(config.destination, {
            text: `*[SATURN - ${severity.toUpperCase()}]* ${title}\n${message}`,
            title,
            message,
            severity,
            timestamp: new Date().toISOString(),
          });
        } else if (config.type === "email") {
          const nodemailer = (await import("nodemailer")).default;
          const smtpConfig = JSON.parse(config.config);
          const transporter = nodemailer.createTransport(smtpConfig);
          await transporter.sendMail({
            from: `"Saturn Core" <${smtpConfig.auth.user}>`,
            to: config.destination,
            subject: `[SATURN] ${severity.toUpperCase()}: ${title}`,
            text: message,
          });
        }
      } catch (error) {
        console.error(
          `Failed to send notification to ${config.destination}:`,
          error
        );
      }
    }
  }
}

// ── Background metrics updater ──────────────────────────────────────────
let lastProcessUpdate = 0;

async function updateAllServerMetrics() {
  const connections = db
    .prepare(
      `SELECT sc.*, s.name as serverName 
       FROM ssh_connections sc 
       JOIN servers s ON sc.serverId = s.id 
       WHERE sc.status = 'connected'`
    )
    .all() as any[];

  for (const conn of connections) {
    try {
      const key = `${conn.username}@${conn.host}:${conn.port}`;
      const server = db
        .prepare("SELECT os FROM servers WHERE id = ?")
        .get(conn.serverId) as any;
      const osType = (server?.os === "windows" ? "windows" : "linux") as OSType;

      let metrics: SystemMetrics;
      try {
        metrics = await sshAgent.getSystemMetrics(key, osType);
      } catch {
        const config: SSHConnectionConfig = {
          host: conn.host,
          port: conn.port,
          username: conn.username,
        };
        if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
        if (conn.encryptedPassword)
          config.password = decrypt(conn.encryptedPassword);

        await sshAgent.connect(config);
        metrics = await sshAgent.getSystemMetrics(key, osType);
      }

      const detectedOs = metrics.os.toLowerCase().includes("windows")
        ? "windows"
        : "linux";

      db.prepare(
        `UPDATE servers SET 
         cpu = ?, memory = ?, disk = ?, uptime = ?, os = ?, kernel = ?, 
         load_avg = ?, lastCheck = ?, status = ? WHERE id = ?`
      ).run(
        metrics.cpu,
        metrics.memory,
        metrics.disk,
        metrics.uptime,
        detectedOs,
        metrics.kernel,
        JSON.stringify(metrics.loadAvg),
        new Date().toISOString(),
        metrics.cpu > 90 || metrics.memory > 90 ? "degraded" : "online",
        conn.serverId
      );

      db.prepare("UPDATE ssh_connections SET lastConnected = ? WHERE id = ?").run(
        new Date().toISOString(),
        conn.id
      );

      evaluateThresholds(conn.serverId, conn.serverName, metrics, db);
      emitServerMetrics(conn.serverId, {
        cpu: metrics.cpu,
        memory: metrics.memory,
        disk: metrics.disk,
        uptime: metrics.uptime,
        status:
          metrics.cpu > 90 || metrics.memory > 90 ? "degraded" : "online",
        timestamp: new Date().toISOString(),
      });

      if (Date.now() - lastProcessUpdate > 5 * 60 * 1000) {
        const { script: procScript } = ScriptGenerator.generate({
          category: "processes",
          action: "list",
          os: osType,
          params: {},
        });
        const processResult = await sshAgent.execCommand(key, procScript);
        try {
          const processes = JSON.parse(processResult.stdout);
          const insertProcess = db.prepare(
            "INSERT INTO process_metrics_history (serverId, pid, name, cpu, mem, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
          );
          const nowIso = new Date().toISOString();
          for (const p of Array.isArray(processes) ? processes : []) {
            const cpuVal = parseFloat(
              p.cpu?.toString().replace("%", "") || "0"
            );
            const memVal = parseFloat(
              p.mem?.toString().replace("%", "") || "0"
            );
            insertProcess.run(
              conn.serverId,
              p.pid || "0",
              p.name || "unknown",
              cpuVal,
              memVal,
              nowIso
            );
          }
        } catch (e) {
          console.error(`Failed to parse processes for ${conn.host}`);
        }
      }
    } catch (error: any) {
      console.error(`Failed to update metrics for ${conn.host}:`, error.message);
      db.prepare("UPDATE servers SET status = 'offline', lastCheck = ? WHERE id = ?").run(
        new Date().toISOString(),
        conn.serverId
      );
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
    const history = db
      .prepare(
        "SELECT name, AVG(cpu) as avg_cpu, AVG(mem) as avg_mem FROM process_metrics_history WHERE serverId = ? AND timestamp > ? GROUP BY name ORDER BY avg_cpu DESC LIMIT 10"
      )
      .all(s.id, yesterday) as any[];

    if (history.length > 0) {
      const summary = `### Daily Process Metrics Summary: ${s.name} (${s.ip})
**Period:** ${yesterday} to ${new Date().toISOString()}

| Process | Avg CPU | Avg Mem |
|---------|---------|---------|
${history
  .map(
    (h) => `| ${h.name} | ${h.avg_cpu.toFixed(2)}% | ${h.avg_mem.toFixed(2)}MB |`
  )
  .join("\n")}

*Data archived for ContextP compliance.*`;

      writeAuditLog({
        id: `METRICS-${s.id}-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        type: "success",
        domain: "AUDIT",
        title: `Process Metrics Summary - ${s.name}`,
        detail: summary,
      });
    }
  }

  const fifteenDaysAgo = new Date(
    Date.now() - 15 * 24 * 60 * 60 * 1000
  ).toISOString();
  db.prepare("DELETE FROM process_metrics_history WHERE timestamp < ?").run(
    fifteenDaysAgo
  );
}

// ── Seed data ───────────────────────────────────────────────────────────
seedDatabase(db);

// ── Import setup.json ──────────────────────────────────────────────────
const SETUP_JSON_PATH = path.join(process.cwd(), "setup.json");
if (fs.existsSync(SETUP_JSON_PATH)) {
  try {
    const setupData = JSON.parse(fs.readFileSync(SETUP_JSON_PATH, "utf-8"));
    if (setupData.aiProvider) {
      const existing = db
        .prepare("SELECT COUNT(*) as c FROM ai_providers WHERE provider = ?")
        .get(setupData.aiProvider.provider) as any;
      if (existing.c === 0) {
        const {
          id,
          name,
          provider,
          model,
          apiKey,
          endpoint,
          enabled,
          createdAt,
        } = setupData.aiProvider;
        const encryptedKey = apiKey ? encrypt(apiKey) : null;
        db.prepare(
          `INSERT INTO ai_providers (id, name, provider, model, api_key, endpoint, enabled, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          name,
          provider,
          model,
          encryptedKey,
          endpoint || null,
          enabled,
          createdAt
        );

        if (apiKey) {
          process.env[`${provider.toUpperCase()}_API_KEY`] = apiKey;
          if (provider === "google") process.env.GEMINI_API_KEY = apiKey;
          if (provider === "moonshot") process.env.MOONSHOT_API_KEY = apiKey;
          if (provider === "openai") process.env.OPENAI_API_KEY = apiKey;
          if (provider === "anthropic") process.env.ANTHROPIC_API_KEY = apiKey;
        }
        process.env.AI_PROVIDER = provider;
        process.env.ACTIVE_AI_PROVIDER = provider;
        if (model) process.env[`${provider.toUpperCase()}_MODEL`] = model;

        console.log(`[SETUP] AI provider imported: ${name} (${model})`);
      }
    }
  } catch (e: any) {
    console.error("[SETUP] Failed to import setup.json:", e.message);
  }
  try {
    fs.unlinkSync(SETUP_JSON_PATH);
  } catch {}
}

initLLMService(db);
initDualProviders();

// ══════════════════════════════════════════════════════════════════════════
// ── Saturn-X JWT Middleware ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

// Zod validation middleware
function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({
          error: "VALIDATION_ERROR",
          message: result.error.issues.map((i) => i.message).join(", "),
        });
    }
    req.body = result.data;
    next();
  };
}

function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err)
        return res.status(403).json({ error: "Invalid or expired token" });
      (req as any).user = user;
      next();
    });
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ── Server startup ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

async function startServer() {
  const app = express();

  app.use(cors());

  app.use(
    helmet({
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
      crossOriginEmbedderPolicy: false,
    })
  );

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
      error: "Too many requests from this IP, please try again after 15 minutes",
    },
  });
  app.use("/api/", globalLimiter);

  const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {
      error: "Too many login attempts. Please try again in 1 minute.",
    },
  });

  // Not used as middleware directly anymore; auth.ts has its own limiter

  app.use(express.json({ limit: "1mb" }));

  // ── Public paths (no JWT required) ─────────────────────────────────
  app.use("/api", (req, res, next) => {
    const PUBLIC_PATHS = ["/health", "/setup/status", "/setup/import", "/admin/login"];
    if (PUBLIC_PATHS.includes(req.path)) return next();
    authenticateJWT(req, res, next);
  });

  // ── Mount all route modules ────────────────────────────────────────

  // Auth (/api/admin/login, /api/admin/create)
  app.use("/api/admin", createAuthRouter(db));

  // Setup (/api/setup/status, /api/health)
  app.use("/api", createSetupRouter(db));

  // Servers CRUD + SSH + exec + SSE + refresh
  app.use("/api", createServersRouter(db, sshAgent, ScriptGenerator, decrypt, updateAllServerMetrics));

  // Incidents
  const aresWorker = new ARESWorker(db, sshAgent);
  app.use("/api", createIncidentsRouter(db, aresWorker, sendNotification));

  // Notifications
  app.use("/api", createNotificationsRouter(db));

  // Skills + remediation
  app.use("/api", createSkillsRouter(db, sshAgent, decrypt, getLLMResponse, sendNotification));

  // AI providers
  app.use("/api", createAiRouter(db));

  // Thresholds
  app.use("/api", createThresholdsRouter(db));

  // Proactive activities
  app.use("/api", createProactiveRouter(db));

  // Cloud credentials + scan + SSM
  app.use("/api", createCloudRouter(db));

  // Neural (generate-script, execute, analyze, generate-skill)
  app.use("/api", createNeuralRouter(db, sshAgent, decrypt, getLLMResponse));

  // ContextP
  app.use("/api", createContextpRouter(db));

  // Compliance + audit
  app.use("/api", createComplianceRouter(db));

  // Admin users + OBPA
  app.use("/api/admin", createAdminUsersRouter(db, sshAgent, decrypt, sendNotification));

  // ── Lib admin-router (server sub-tab routes) ──────────────────────
  const adminRouter = createLibAdminRouter(db, sshAgent, ScriptGenerator, decrypt);
  app.use(adminRouter);

  // ── Seed default admin user ────────────────────────────────────────
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as {
    c: number;
  };
  if (userCount.c === 0) {
    const defaultUsername = "admin";
    const defaultPassword = "saturn2024";
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(defaultPassword, salt, 100000, 64, "sha512")
      .toString("hex");
    const passwordHash = `${salt}:${hash}`;
    db.prepare(
      "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(
      "user-default",
      defaultUsername,
      passwordHash,
      "admin",
      new Date().toISOString()
    );
    console.log(
      `Default admin user created: ${defaultUsername} / ${defaultPassword}`
    );
  }

  // ── ARES Worker ────────────────────────────────────────────────────
  aresWorker.start(60000);

  // ── Background SSH Metrics Scheduler ───────────────────────────────
  if (process.env.NODE_ENV === "production") {
    setInterval(updateAllServerMetrics, 30000);
  }

  // ── Vite Integration ───────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        maxAge: 0,
        etag: true,
        lastModified: true,
        setHeaders: (res, path) => {
          if (path.endsWith(".html")) {
            res.setHeader(
              "Cache-Control",
              "no-cache, no-store, must-revalidate"
            );
          } else {
            res.setHeader(
              "Cache-Control",
              "public, max-age=31536000, immutable"
            );
          }
        },
      })
    );
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Content-Type", "text/html");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = process.env.PORT;
  if (!PORT) {
    console.error("\n" + "=".repeat(50));
    console.error("FATAL: La variable PORT no está definida en el entorno.");
    console.error("Asegúrate de que el archivo .env contiene PORT=3000");
    console.error("=".repeat(50) + "\n");
    process.exit(1);
  }

  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Saturn Core v0.1.0-FIX running on http://0.0.0.0:${PORT} (NODE_ENV: ${process.env.NODE_ENV})`
    );
    console.log(`Neural Engine: ARES 1.0.0`);
    console.log(`SSH Agent ready. Connect to servers via POST /api/ssh/connect`);
    console.log(`WebSocket Server: Active and listening on port ${PORT}`);
  });
}

startServer();
