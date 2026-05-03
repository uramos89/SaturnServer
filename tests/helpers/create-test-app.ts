import express from "express";
import Database from "better-sqlite3";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { initSocket } from "../../src/services/socket-service.js";
import { ARESWorker } from "../../src/lib/ares-worker.js";
import { sshAgent } from "../../src/lib/ssh-agent.js";
import { ScriptGenerator } from "../../src/lib/script-generator.js";
import { ScriptValidator } from "../../src/lib/script-validator.js";
import { decrypt } from "../../src/lib/crypto-utils.js";
import { initLLMService } from "../../src/services/llm-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a fully initialized Express app with an in-memory SQLite database.
 * Used for integration testing with supertest.
 */
export async function createTestApp(): Promise<{
  app: express.Application;
  db: Database.Database;
  token: string;
}> {
  const db = new Database(":memory:");

  // ── Schema ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, name TEXT, ip TEXT, port INTEGER DEFAULT 22, username TEXT, os TEXT, status TEXT, cpu REAL, memory REAL, disk REAL, uptime INTEGER, kernel TEXT, load_avg TEXT, lastCheck TEXT, tags TEXT, cloud_provider TEXT);
    CREATE TABLE IF NOT EXISTS ssh_connections (id TEXT PRIMARY KEY, serverId TEXT UNIQUE, host TEXT, port INTEGER, username TEXT, encryptedKey TEXT, encryptedPassword TEXT, hostname TEXT, status TEXT, lastConnected TEXT, FOREIGN KEY (serverId) REFERENCES servers(id));
    CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, serverId TEXT, severity TEXT, title TEXT, description TEXT, status TEXT, timestamp TEXT, resolved_at TEXT);
    CREATE TABLE IF NOT EXISTS obpa_cycles (id TEXT PRIMARY KEY, incidentId TEXT, phase TEXT, observation TEXT, proposal TEXT, remediation_script TEXT, execution_result TEXT, confidence REAL, status TEXT DEFAULT 'pending', timestamp TEXT);
    CREATE TABLE IF NOT EXISTS contextp_entries (path TEXT PRIMARY KEY, content TEXT, type TEXT, lastUpdated TEXT);
    CREATE TABLE IF NOT EXISTS notification_configs (id TEXT PRIMARY KEY, type TEXT, destination TEXT, config TEXT, enabled INTEGER);
    CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, type TEXT, event TEXT, detail TEXT, metadata TEXT, timestamp TEXT);
    CREATE TABLE IF NOT EXISTS command_history (id TEXT PRIMARY KEY, serverId TEXT, command TEXT, stdout TEXT, stderr TEXT, exitCode INTEGER, executedBy TEXT, timestamp TEXT);
    CREATE TABLE IF NOT EXISTS ai_providers (id TEXT PRIMARY KEY, name TEXT, provider TEXT, model TEXT, api_key TEXT, endpoint TEXT, enabled INTEGER DEFAULT 0, created_at TEXT);
    CREATE TABLE IF NOT EXISTS cloud_credentials (id TEXT PRIMARY KEY, name TEXT, provider TEXT, type TEXT, encrypted_path TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS process_metrics_history (id INTEGER PRIMARY KEY AUTOINCREMENT, serverId TEXT, pid TEXT, name TEXT, cpu REAL, mem REAL, timestamp TEXT, FOREIGN KEY (serverId) REFERENCES servers(id));
    CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, name TEXT, language TEXT, version TEXT, description TEXT, path TEXT, enabled INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS remediation_configs (serverId TEXT PRIMARY KEY, mode TEXT DEFAULT 'auto', skillId TEXT, confidence_threshold REAL DEFAULT 0.7, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS proactive_activities (id TEXT PRIMARY KEY, name TEXT, skillId TEXT, condition TEXT, schedule TEXT, targetType TEXT, targets TEXT, enabled INTEGER DEFAULT 1, last_run TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS proactive_execution_history (id TEXT PRIMARY KEY, activityId TEXT, activityName TEXT, serverId TEXT, condition TEXT, conditionMet INTEGER, status TEXT, output TEXT, script TEXT, error TEXT, executed_at TEXT);
    CREATE TABLE IF NOT EXISTS skill_assignments (id TEXT PRIMARY KEY, skillId TEXT, targetId TEXT, targetType TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, password_hash TEXT, role TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS threshold_configs (serverId TEXT, metric TEXT, warning REAL, critical REAL, PRIMARY KEY (serverId, metric));
    -- sqlite_sequence is auto-created by SQLite for AUTOINCREMENT columns
  `);

  // ── Seed default admin user ───────────────────────────────────
  const defaultPassword = "saturn2024";
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(defaultPassword, salt, 100000, 64, "sha512").toString("hex");
  db.prepare("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
    .run("user-test", "admin", `${salt}:${hash}`, "administrator", new Date().toISOString());

  // ── Seed global remediation config ─────────────────────────────
  db.prepare("INSERT INTO remediation_configs (serverId, mode, confidence_threshold) VALUES ('global', 'auto', 0.7)").run();

  // ── Create Express app ─────────────────────────────────────────
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── CORS ────────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    next();
  });

  // ── JWT Middleware ──────────────────────────────────────────────
  const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
  const PUBLIC_PATHS = ["/health", "/setup/status", "/setup/import", "/admin/login"];

  function authenticateJWT(req: any, res: any, next: any) {
    if (PUBLIC_PATHS.includes(req.path)) return next();
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }
  app.use("/api", authenticateJWT);

  // ── Health endpoint (no auth) ──────────────────────────────────
  app.get("/health", (_req, res) => res.json({ status: "ok", engine: "ARES 1.0.0" }));

  // ── Import and mount routes ────────────────────────────────────
  const { createAuthRouter } = await import("../../src/routes/auth.js");
  const { createServersRouter } = await import("../../src/routes/servers.js");
  const { createIncidentsRouter } = await import("../../src/routes/incidents.js");
  const { createNotificationsRouter } = await import("../../src/routes/notifications.js");
  const { createThresholdsRouter } = await import("../../src/routes/thresholds.js");
  const { createProactiveRouter } = await import("../../src/routes/proactive.js");
  const { createComplianceRouter } = await import("../../src/routes/compliance.js");
  const { createAiRouter } = await import("../../src/routes/ai.js");
  const { createSkillsRouter } = await import("../../src/routes/skills.js");
  const { createCloudRouter } = await import("../../src/routes/cloud.js");
  const { createContextpRouter } = await import("../../src/routes/contextp.js");

  app.use("/api/admin", createAuthRouter(db));
  app.use("/api", createServersRouter(db, sshAgent, ScriptGenerator, decrypt, async () => {}));
  // Mock ARES worker and sendNotification for test mode
  const mockAresWorker = { wakeUp: async () => {} };
  const mockSendNotification = async () => {};
  app.use("/api", createIncidentsRouter(db, mockAresWorker, mockSendNotification));
  app.use("/api", createNotificationsRouter(db));
  app.use("/api", createThresholdsRouter(db));
  app.use("/api", createProactiveRouter(db));
  app.use("/api", createComplianceRouter(db));
  app.use("/api", createAiRouter(db));
  app.use("/api", createSkillsRouter(db, ScriptGenerator));
  app.use("/api", createCloudRouter(db, decrypt));
  app.use("/api", createContextpRouter(db));

  // ── Generate test JWT ───────────────────────────────────────────
  const token = jwt.sign(
    { id: "user-test", username: "admin", role: "administrator" },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  return { app, db, token };
}
