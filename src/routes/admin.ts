import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import crypto from "crypto";
import { logAudit } from "../lib/server-helpers.js";
import { UserCreateSchema } from "../lib/validators.js";

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

export function createAdminRouter(
  db: Database.Database,
  sshAgent: any,
  decrypt: (text: string) => string,
  sendNotification: (type: string, title: string, message: string, severity: string) => Promise<void>
): Router {
  const router = Router();

  // GET /api/admin/users
  router.get("/users", (req: Request, res: Response) => {
    const users = db
      .prepare("SELECT id, username, role, created_at FROM users")
      .all();
    res.json(users);
  });

  // DELETE /api/admin/users/:id
  router.delete("/users/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const userCount = db
      .prepare("SELECT COUNT(*) as c FROM users")
      .get() as { c: number };
    if (userCount.c <= 1) {
      return res
        .status(400)
        .json({ error: "Cannot delete the last admin user" });
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    logAudit(db, "USER", "USER_DELETED", `User ${id} deleted`, {});
    res.json({ success: true });
  });

  // POST /api/admin/reset-users - BLOCKED per SATURN-X Protocol
  router.post("/reset-users", (req: Request, res: Response) => {
    res
      .status(403)
      .json({
        error: "SECURITY_BLOCK",
        message:
          "This operation is restricted to direct console access only.",
      });
  });

  // POST /api/admin/create-user
  router.post("/create-user", validate(UserCreateSchema), (req: Request, res: Response) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha512")
      .toString("hex");
    const passwordHash = `${salt}:${hash}`;
    const createdAt = new Date().toISOString();

    try {
      db.prepare(
        "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(id, username, passwordHash, role || "admin", createdAt);

      logAudit(
        db,
        "USER",
        "USER_CREATED",
        `Global user ${username} created by system`,
        {}
      );

      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── OBPA ──────────────────────────────────────────────────────────────

  // GET /api/obpa/pending
  router.get("/obpa/pending", (req: Request, res: Response) => {
    const pending = db
      .prepare("SELECT * FROM obpa_cycles WHERE status = 'pending'")
      .all();
    res.json(pending);
  });

  // POST /api/obpa/approve
  router.post("/obpa/approve", async (req: Request, res: Response) => {
    const { obpaId, approved } = req.body;
    const cycle = db
      .prepare("SELECT * FROM obpa_cycles WHERE id = ?")
      .get(obpaId) as any;
    if (!cycle) return res.status(404).json({ error: "Cycle not found" });

    if (approved) {
      db.prepare("UPDATE obpa_cycles SET status = 'approved' WHERE id = ?").run(
        obpaId
      );
      db.prepare(
        "INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)"
      ).run(
        `audit-${Date.now()}`,
        "USER",
        "REMEDIATION_APPROVED",
        `User approved remediation for incident ${cycle.incidentId}`,
        new Date().toISOString()
      );

      const incident = db
        .prepare("SELECT * FROM incidents WHERE id = ?")
        .get(cycle.incidentId) as any;
      if (incident) {
        const sshConn = db
          .prepare("SELECT * FROM ssh_connections WHERE serverId = ?")
          .get(incident.serverId) as any;
        if (sshConn && cycle.remediation_script) {
          try {
            const key = `${sshConn.username}@${sshConn.host}:${sshConn.port}`;
            try {
              await sshAgent.getSystemMetrics(key);
            } catch {
              const config: any = {
                host: sshConn.host,
                port: sshConn.port,
                username: sshConn.username,
              };
              if (sshConn.encryptedKey)
                config.privateKey = decrypt(sshConn.encryptedKey);
              if (sshConn.encryptedPassword)
                config.password = decrypt(sshConn.encryptedPassword);
              await sshAgent.connect(config);
            }
            const execResult = await sshAgent.execScript(
              key,
              cycle.remediation_script
            );
            db.prepare(
              "UPDATE obpa_cycles SET execution_result = ? WHERE id = ?"
            ).run(
              `Exit code: ${execResult.code}\n${execResult.stdout.substring(0, 2000)}`,
              obpaId
            );

            const metrics = await sshAgent.getSystemMetrics(key);
            const os =
              metrics.os.toLowerCase().includes("linux")
                ? "linux"
                : metrics.os.toLowerCase().includes("windows")
                  ? "windows"
                  : "unix";
            db.prepare(
              `UPDATE servers SET cpu = ?, memory = ?, disk = ?, status = ?, lastCheck = ? WHERE id = ?`
            ).run(
              metrics.cpu,
              metrics.memory,
              metrics.disk,
              "online",
              new Date().toISOString(),
              sshConn.serverId
            );
          } catch (e: any) {
            db.prepare(
              "UPDATE obpa_cycles SET execution_result = ? WHERE id = ?"
            ).run(`SSH execution failed: ${e.message}`, obpaId);
          }
        }
      }

      db.prepare("UPDATE incidents SET status = 'closed' WHERE id = ?").run(
        cycle.incidentId
      );
      await sendNotification(
        "success",
        "Remediation Successful",
        `Remediation applied for incident ${cycle.incidentId} after manual approval.`,
        "success"
      );
    } else {
      db.prepare("UPDATE obpa_cycles SET status = 'rejected' WHERE id = ?").run(
        obpaId
      );
      db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(
        cycle.incidentId
      );
    }
    res.json({ success: true });
  });

  // ── Admin User Creation (duplicated from auth.ts for backward compat) ──
  router.post("/create", (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 8) {
      return res
        .status(400)
        .json({
          error:
            "Username required and password must be at least 8 characters",
        });
    }
    const existing = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username) as any;
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }
    const id = `user-${Date.now()}`;
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha512")
      .toString("hex");
    const passwordHash = `${salt}:${hash}`;
    const createdAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, username, passwordHash, "admin", createdAt);
    db.prepare(
      "INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)"
    ).run(
      `audit-${Date.now()}`,
      "USER",
      "ADMIN_CREATED",
      `Admin user ${username} created`,
      createdAt
    );
    res.json({ success: true, id, message: "Admin user created successfully" });
  });

  return router;
}
