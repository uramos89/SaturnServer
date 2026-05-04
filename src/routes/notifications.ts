import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";

export function createNotificationsRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/notifications
  router.get("/notifications", (req: Request, res: Response) => {
    const configs = db.prepare("SELECT * FROM notification_configs").all();
    res.json(
      configs.map((c: any) => ({
        ...c,
        config: c.config ? JSON.parse(c.config) : {},
      }))
    );
  });

  // POST /api/notifications/config
  router.post("/notifications/config", (req: Request, res: Response) => {
    const { type, destination, config, enabled } = req.body;
    const id = `notif-${Date.now()}`;
    db.prepare(
      "INSERT OR REPLACE INTO notification_configs (id, type, destination, config, enabled) VALUES (?, ?, ?, ?, ?)"
    ).run(id, type, destination, JSON.stringify(config), enabled ? 1 : 0);
    res.json({ id, success: true });
  });

  // DELETE /api/notifications/:id
  router.delete("/notifications/:id", (req: Request, res: Response) => {
    db.prepare("DELETE FROM notification_configs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // POST /api/telegram/webhook
  router.post("/telegram/webhook", async (req: Request, res: Response) => {
    res.sendStatus(200);
    try {
      const configs = db
        .prepare("SELECT * FROM notification_configs WHERE type = 'telegram' AND enabled = 1")
        .all() as any[];
      if (configs.length === 0) return;

      const { handleTelegramUpdate } = await import("../services/telegram-service.js");
      for (const cfg of configs) {
        const parsed = cfg.config ? JSON.parse(cfg.config) : {};
        if (parsed.botToken) {
          await handleTelegramUpdate(parsed.botToken, req.body, db);
        }
      }
    } catch (e: any) {
      console.error("[TELEGRAM] Webhook error:", e.message);
    }
  });

  // POST /api/telegram/set-webhook
  router.post("/telegram/set-webhook", async (req: Request, res: Response) => {
    const { botToken } = req.body;
    if (!botToken) return res.status(400).json({ success: false, error: "botToken required", code: "VALIDATION_ERROR", status: 400 });
    try {
      const axios = (await import("axios")).default;
      const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
      const webhookUrl = `${baseUrl}/api/telegram/webhook`;
      const result = await axios.post(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        { url: webhookUrl },
        { timeout: 10000 }
      );
      res.json({ success: result.data.ok, description: result.data.description });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, code: "INTERNAL_ERROR", status: 500 });
    }
  });

  // POST /api/telegram/test
  router.post("/telegram/test", async (req: Request, res: Response) => {
    const { botToken, chatId } = req.body;
    if (!botToken || !chatId) return res.status(400).json({ success: false, error: "botToken and chatId required", code: "VALIDATION_ERROR", status: 400 });
    try {
      const { sendTelegramMessage } = await import("../services/telegram-service.js");
      const result = await sendTelegramMessage(
        botToken,
        chatId,
        "<b>🔔 Saturn Test Notification</b>\n\nSi ves este mensaje, la integración con Telegram funciona correctamente."
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, code: "INTERNAL_ERROR", status: 500 });
    }
  });

  return router;
}
