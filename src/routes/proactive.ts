import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import crypto from "crypto";

export function createProactiveRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/proactive
  router.get("/proactive", (req: Request, res: Response) => {
    const activities = db.prepare("SELECT * FROM proactive_activities").all();
    res.json(activities);
  });

  // POST /api/proactive
  router.post("/proactive", (req: Request, res: Response) => {
    const { id, name, skillId, condition, schedule, targetType, targets, enabled } = req.body;
    const actId = id || crypto.randomUUID();
    db.prepare(
      `INSERT OR REPLACE INTO proactive_activities (id, name, skillId, condition, schedule, targetType, targets, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(actId, name, skillId, condition, schedule, targetType, JSON.stringify(targets), enabled ? 1 : 0);
    res.json({ success: true, id: actId });
  });

  // DELETE /api/proactive/:id
  router.delete("/proactive/:id", (req: Request, res: Response) => {
    db.prepare("DELETE FROM proactive_activities WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // GET /api/proactive/history
  router.get("/proactive/history", (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const activityId = req.query.activityId as string;
    let rows;
    if (activityId) {
      rows = db
        .prepare(
          "SELECT * FROM proactive_execution_history WHERE activityId = ? ORDER BY executed_at DESC LIMIT ?"
        )
        .all(activityId, limit);
    } else {
      rows = db
        .prepare("SELECT * FROM proactive_execution_history ORDER BY executed_at DESC LIMIT ?")
        .all(limit);
    }
    res.json(rows);
  });

  // PATCH /api/proactive/:id/toggle
  router.patch("/proactive/:id/toggle", (req: Request, res: Response) => {
    const activity = db
      .prepare("SELECT * FROM proactive_activities WHERE id = ?")
      .get(req.params.id) as any;
    if (!activity) return res.status(404).json({ success: false, error: "Activity not found", code: "NOT_FOUND", status: 404 });
    const newState = activity.enabled ? 0 : 1;
    db.prepare("UPDATE proactive_activities SET enabled = ? WHERE id = ?").run(newState, req.params.id);
    res.json({ success: true, enabled: newState === 1 });
  });

  return router;
}
