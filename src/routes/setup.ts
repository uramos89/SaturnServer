import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";

export function createSetupRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/setup/status
  router.get("/setup/status", (req: Request, res: Response) => {
    const userCount = db
      .prepare("SELECT COUNT(*) as c FROM users")
      .get() as any;
    const aiCount = db
      .prepare("SELECT COUNT(*) as c FROM ai_providers WHERE enabled = 1")
      .all().length;
    res.json({
      initialized: userCount.c > 0,
      aiConfigured: aiCount > 0,
    });
  });

  // GET /api/health
  router.get("/health", (req: Request, res: Response) => {
    const sshCount = db
      .prepare(
        "SELECT COUNT(*) as c FROM ssh_connections WHERE status = 'connected'"
      )
      .get() as any;
    const serverCount = db
      .prepare("SELECT COUNT(*) as c FROM servers")
      .get() as any;
    console.log("Health check triggered");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0-FIX",
      cwd: process.cwd(),
      engine: "ARES 1.0.0",
      ssh: {
        connected: sshCount.c,
        total: db.prepare("SELECT COUNT(*) as c FROM ssh_connections").get() as any,
      },
      servers: serverCount.c,
    });
  });

  return router;
}
