import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";

export function createComplianceRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/audit
  router.get("/audit", (req: Request, res: Response) => {
    const logs = db
      .prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100")
      .all();
    res.json(
      logs.map((l: any) => ({
        ...l,
        metadata: l.metadata ? JSON.parse(l.metadata) : {},
      }))
    );
  });

  // GET /api/compliance/report
  router.get("/compliance/report", (req: Request, res: Response) => {
    const logs = db
      .prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500")
      .all() as any[];
    const total = logs.length;
    const byType: Record<string, number> = {};
    const byEvent: Record<string, number> = {};
    let complianceCount = 0;

    for (const l of logs) {
      byType[l.type] = (byType[l.type] || 0) + 1;
      byEvent[l.event] = (byEvent[l.event] || 0) + 1;
      const meta = l.metadata ? JSON.parse(l.metadata) : {};
      if (meta._compliance) complianceCount++;
    }

    res.json({
      generated: new Date().toISOString(),
      totalEvents: total,
      eventsWithCompliance: complianceCount,
      byType,
      byEvent,
      gdpr: {
        dataCategories: ["system", "user", "infrastructure"],
        legalBasis: "legitimate_interest",
      },
      pci: { scope: "out_of_scope", requirements: ["10.2", "10.3", "10.4"] },
      hipaa: { ePHI: false, safeguards: ["administrative", "technical"] },
      recentEvents: logs.slice(0, 20).map((l) => ({
        id: l.id,
        type: l.type,
        event: l.event,
        detail: l.detail?.slice(0, 100),
        timestamp: l.timestamp,
      })),
    });
  });

  return router;
}
