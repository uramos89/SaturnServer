import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import { logAudit } from "../lib/server-helpers.js";
import crypto from "crypto";

export function createIncidentsRouter(
  db: Database.Database,
  aresWorker: { wakeUp: () => Promise<void> },
  sendNotification: (type: string, title: string, message: string, severity: string) => Promise<void>
): Router {
  const router = Router();

  // GET /api/incidents
  router.get("/incidents", (req: Request, res: Response) => {
    const incidents = db
      .prepare(
        "SELECT incidents.*, servers.name as serverName FROM incidents JOIN servers ON incidents.serverId = servers.id ORDER BY timestamp DESC"
      )
      .all();
    res.json(incidents);
  });

  // POST /api/incidents/create
  router.post("/incidents/create", async (req: Request, res: Response) => {
    const { serverId, title, description, severity } = req.body;
    const id = `inc-${Date.now()}`;
    const timestamp = new Date().toISOString();
    db.prepare(
      "INSERT INTO incidents (id, serverId, title, description, severity, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, serverId, title, description, severity, "open", timestamp);

    logAudit(db, "SYSTEM", "INCIDENT_CREATED", `Incident ${id} on ${serverId}: ${title}`, {
      incidentId: id,
      severity,
      compliance_tags: ["GDPR"],
    });

    await sendNotification("warning", `New Incident: ${title}`, description, severity);

    aresWorker.wakeUp().catch(console.error);

    res.json({ id, status: "open" });
  });

  // POST /api/incidents/:id/resolve
  router.post("/incidents/:id/resolve", (req: Request, res: Response) => {
    const { id } = req.params;
    db.prepare("UPDATE incidents SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    res.json({ success: true });
  });

  return router;
}
