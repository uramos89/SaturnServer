import type Database from "better-sqlite3";

interface NotificationConfig {
  id: string;
  type: string;
  destination: string;
  config: string;
  enabled: number;
}

interface WebhookPayload {
  event: string;
  title: string;
  message: string;
  severity: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Send a notification through all configured channels.
 * Returns an array of results (one per channel).
 */
export async function sendNotification(
  db: Database.Database,
  event: string,
  title: string,
  message: string,
  severity: string = "info",
  metadata?: Record<string, any>
): Promise<{ channel: string; success: boolean; error?: string }[]> {
  const configs = db.prepare("SELECT * FROM notification_configs WHERE enabled = 1").all() as NotificationConfig[];
  const results: { channel: string; success: boolean; error?: string }[] = [];

  for (const cfg of configs) {
    try {
      const parsedConfig = cfg.config ? JSON.parse(cfg.config) : {};
      
      if (cfg.type === "webhook") {
        await sendWebhook(cfg.destination, { event, title, message, severity, timestamp: new Date().toISOString(), metadata });
        results.push({ channel: `webhook:${cfg.destination}`, success: true });
      } else if (cfg.type === "email") {
        await sendEmail(parsedConfig, cfg.destination, title, message);
        results.push({ channel: `email:${cfg.destination}`, success: true });
      } else if (cfg.type === "telegram") {
        const { sendTelegramMessage, formatNotification } = await import("./telegram-service.js");
        const result = await sendTelegramMessage(
          parsedConfig.botToken,
          parsedConfig.chatId || cfg.destination,
          formatNotification(event, title, message, severity)
        );
        results.push({ channel: `telegram:${parsedConfig.chatId || cfg.destination}`, success: result.ok, error: result.error });
      }
    } catch (err: any) {
      results.push({ channel: `${cfg.type}:${cfg.destination}`, success: false, error: err.message });
    }
  }

  // If no channels configured, log a warning
  if (configs.length === 0) {
    console.log(`[NOTIFY] No notification channels configured. Event: ${title}`);
  }

  return results;
}

async function sendWebhook(url: string, payload: WebhookPayload): Promise<void> {
  const axios = (await import("axios")).default;
  await axios.post(url, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
  });
}

async function sendEmail(config: any, to: string, subject: string, body: string): Promise<void> {
  // SMTP email sending via nodemailer if available, or fallback to a simple log
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: config.auth || { user: "", pass: "" },
    });
    await transporter.sendMail({
      from: config.from || config.auth?.user,
      to,
      subject,
      text: body,
    });
  } catch {
    // nodemailer might not be installed, log instead
    console.log(`[NOTIFY] Email would be sent to ${to}: ${subject} — ${body.slice(0, 100)}`);
  }
}
