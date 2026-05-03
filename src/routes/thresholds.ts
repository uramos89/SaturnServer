import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";

export function createThresholdsRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/servers/:id/thresholds
  router.get("/servers/:id/thresholds", (req: Request, res: Response) => {
    const { id } = req.params;
    const thresholds = db.prepare("SELECT * FROM threshold_configs WHERE serverId = ?").all(id);
    res.json(thresholds);
  });

  // POST /api/servers/:id/thresholds
  router.post("/servers/:id/thresholds", (req: Request, res: Response) => {
    const { id } = req.params;
    const { thresholds } = req.body;

    if (!Array.isArray(thresholds)) {
      return res.status(400).json({ error: "thresholds must be an array" });
    }

    db.prepare("DELETE FROM threshold_configs WHERE serverId = ?").run(id);
    const insert = db.prepare(
      "INSERT INTO threshold_configs (serverId, metric, warning, critical) VALUES (?, ?, ?, ?)"
    );
    for (const t of thresholds) {
      insert.run(id, t.metric, t.warning, t.critical);
    }

    res.json({ success: true });
  });

  // GET /api/thresholds/:id (alias for frontend)
  router.get("/thresholds/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const thresholds = db.prepare("SELECT * FROM threshold_configs WHERE serverId = ?").all(id);
    res.json(thresholds);
  });

  return router;
}
