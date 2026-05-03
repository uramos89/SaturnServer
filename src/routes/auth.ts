import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { JWT_SECRET, logAudit } from "../lib/server-helpers.js";

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Please try again in 1 minute." },
});

export function createAuthRouter(db: Database.Database): Router {
  const router = Router();

  // ── Admin Login ───────────────────────────────────────
  router.post("/login", loginLimiter, (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const [salt, hash] = user.password_hash.split(":");
    const loginHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    if (loginHash !== hash) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    logAudit(db, "USER", "LOGIN_SUCCESS", `User ${username} logged in`);
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  });

  // ── Create Admin User ─────────────────────────────────
  router.post("/create", (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 8) {
      return res
        .status(400)
        .json({ error: "Username required and password must be at least 8 characters" });
    }
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as any;
    if (existing) return res.status(409).json({ error: "User already exists" });

    const id = `user-${Date.now()}`;
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    db.prepare(
      "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, username, `${salt}:${hash}`, "admin", new Date().toISOString());
    res.json({ success: true, id });
  });

  return router;
}
