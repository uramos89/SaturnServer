import Database from "better-sqlite3";
import crypto from "crypto";

/**
 * Seeds the database with initial configuration, admin users, and sample data.
 * This ensures a consistent starting state across environments.
 */
export function seedDatabase(db: Database): void {
  console.log("[SEED] Checking database state...");

  // 1. Initial Admin User
  const adminExists = db.prepare("SELECT count(*) as count FROM users WHERE username = 'admin'").get() as { count: number };
  if (adminExists.count === 0) {
    console.log("[SEED] Creating default admin user...");
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync("admin12345", salt, 100000, 64, "sha512").toString("hex");
    const passwordHash = `${salt}:${hash}`;
    
    db.prepare("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(crypto.randomUUID(), "admin", passwordHash, "administrator", new Date().toISOString());
  }

  // 2. Default AI Providers
  const providerCount = db.prepare("SELECT count(*) as count FROM ai_providers").get() as { count: number };
  if (providerCount.count === 0) {
    console.log("[SEED] Initializing AI providers...");
    const providers = [
      { id: 'gemini', name: 'Google Gemini', provider: 'gemini', enabled: 1 },
      { id: 'moonshot', name: 'Moonshot AI (Kimi)', provider: 'moonshot', enabled: 0 },
      { id: 'openai', name: 'OpenAI (GPT-4)', provider: 'openai', enabled: 0 }
    ];
    
    const insert = db.prepare("INSERT INTO ai_providers (id, name, provider, enabled) VALUES (?, ?, ?, ?)");
    providers.forEach(p => insert.run(p.id, p.name, p.provider, p.enabled));
  }

  // 3. Notification Configs
  const notifyCount = db.prepare("SELECT count(*) as count FROM notification_configs").get() as { count: number };
  if (notifyCount.count === 0) {
    db.prepare("INSERT INTO notification_configs (provider, enabled) VALUES (?, ?)")
      .run("smtp", 0);
  }

  // 4. Sample Incidents (only if no incidents exist)
  const incidentCount = db.prepare("SELECT count(*) as count FROM incidents").get() as { count: number };
  if (incidentCount.count === 0) {
    console.log("[SEED] Inserting sample incidents...");
    db.prepare(`INSERT INTO incidents (id, serverId, title, description, severity, status, timestamp) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        `inc-${Date.now()}`, 
        'srv-local', 
        'Database Load High', 
        'CPU usage exceeded 90% for more than 5 minutes.', 
        'high', 
        'open', 
        new Date().toISOString()
      );
  }

  console.log("[SEED] Database seeding completed.");
}
