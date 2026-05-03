import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { JWT_SECRET, logAudit } from "../lib/server-helpers.js";

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Please try again in 1 minute." },
});

// ── Store refresh tokens in memory (in production use DB/Redis) ──────
const refreshTokens = new Set<string>();

export function createAuthRouter(db: Database.Database): Router {
  const router = Router();

  // ── Admin Login ────────────────────────────────────────────────────
  router.post("/login", loginLimiter, (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid credentials format", code: "VALIDATION_ERROR" });
    }
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    const loginRole = user.role;
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // Verify password (supports both bcrypt and legacy PBKDF2)
    let passwordValid = false;

    if (user.password_hash.startsWith("$2b$") || user.password_hash.startsWith("$2a$")) {
      // bcrypt hash
      passwordValid = bcrypt.compareSync(password, user.password_hash);
    } else {
      // Legacy PBKDF2 hash — verify and migrate to bcrypt
      const [salt, hash] = user.password_hash.split(":");
      if (salt && hash) {
        const loginHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
        if (loginHash === hash) {
          passwordValid = true;
          // Auto-migrate to bcrypt
          const bcryptHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
          db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcryptHash, user.id);
          console.log(`[AUTH] Migrated user ${username} from PBKDF2 to bcrypt`);
        }
      }
    }

    if (!passwordValid) return res.status(401).json({ error: "Invalid credentials" });

    // Generate access token (short-lived)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token (long-lived, single use)
    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh" },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
    refreshTokens.add(refreshToken);

    logAudit(db, "USER", "LOGIN_SUCCESS", `User ${username} logged in`);
    res.json({
      success: true,
      token,
      refreshToken,
      expiresIn: "15m",
      user: { id: user.id, username: user.username, role: user.role },
    });
  });

  // ── Refresh Token ──────────────────────────────────────────────────
  router.post("/refresh", (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });

    if (!refreshTokens.has(refreshToken)) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      if (decoded.type !== "refresh") throw new Error("Invalid token type");

      // Invalidate old refresh token (rotation)
      refreshTokens.delete(refreshToken);

      // Verify user still exists
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id) as any;
      if (!user) return res.status(401).json({ error: "User not found" });

      // Issue new tokens
      const newToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );
      const newRefreshToken = jwt.sign(
        { id: user.id, type: "refresh" },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );
      refreshTokens.add(newRefreshToken);

      res.json({ success: true, token: newToken, refreshToken: newRefreshToken });
    } catch {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
  });

  // ── Logout (invalidate refresh token) ──────────────────────────────
  router.post("/logout", (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (refreshToken) refreshTokens.delete(refreshToken);
    res.json({ success: true });
  });

  // ── Create Admin User ──────────────────────────────────────────────
  router.post("/create", (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid credentials format", code: "VALIDATION_ERROR" });
    }
    const fixedRole = "admin";
    if (typeof username !== 'string' || typeof password !== 'string' || password.length < 8 || /[<>"&]/.test(username)) {
      return res
        .status(400)
        .json({ error: "Username required and password must be a string of at least 8 characters" });
    }
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as any;
    if (existing) return res.status(409).json({ error: "User already exists" });

    const id = `user-${Date.now()}`;
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    db.prepare(
      "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, username, hash, fixedRole, new Date().toISOString());
    res.json({ success: true, id });
  });

  return router;
}
