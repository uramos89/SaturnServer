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
      { id: 'gemini', name: 'Google Gemini', provider: 'gemini', model: 'gemini-1.5-pro', enabled: 1 },
      { id: 'moonshot', name: 'Moonshot AI (Kimi)', provider: 'moonshot', model: 'moonshot-v1', enabled: 0 },
      { id: 'openai', name: 'OpenAI (GPT-4)', provider: 'openai', model: 'gpt-4o', enabled: 0 }
    ];
    
    const insert = db.prepare("INSERT INTO ai_providers (id, name, provider, model, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    providers.forEach(p => insert.run(p.id, p.name, p.provider, p.model, p.enabled, new Date().toISOString()));
  }

  // 3. Notification Configs
  const notifyCount = db.prepare("SELECT count(*) as count FROM notification_configs").get() as { count: number };
  if (notifyCount.count === 0) {
    db.prepare("INSERT INTO notification_configs (id, type, enabled) VALUES (?, ?, ?)")
      .run(crypto.randomUUID(), "smtp", 0);
  }

  // 4. Sample Servers & Remediation Configs
  const serverCount = db.prepare("SELECT count(*) as count FROM servers").get() as { count: number };
  if (serverCount.count === 0) {
    console.log("[SEED] Inserting sample servers...");
    const servers = [
      { id: 'srv-01', name: 'SATURN-CORE-01', ip: '10.0.0.10', os: 'linux', status: 'online', cpu: 12, memory: 45 },
      { id: 'srv-02', name: 'ARES-NEURAL-NODE', ip: '10.0.0.11', os: 'linux', status: 'online', cpu: 85, memory: 92 },
      { id: 'srv-03', name: 'DB-REPLICA-ALPHA', ip: '10.0.0.12', os: 'linux', status: 'degraded', cpu: 40, memory: 30 }
    ];
    const stmt = db.prepare("INSERT INTO servers (id, name, ip, os, status, cpu, memory, disk, uptime, kernel, lastCheck) VALUES (?, ?, ?, ?, ?, ?, ?, 20, 1000, '5.15.0-generic', ?)");
    servers.forEach(s => stmt.run(s.id, s.name, s.ip, s.os, s.status, s.cpu, s.memory, new Date().toISOString()));
    
    // Remediation Configs
    db.prepare("INSERT INTO threshold_configs (serverId, metric, warning, critical) VALUES (?, ?, ?, ?)").run('srv-02', 'memory', 80, 90);
  }

  // 5. Skills
  const skillCount = db.prepare("SELECT count(*) as count FROM skills").get() as { count: number };
  if (skillCount.count === 0) {
    console.log("[SEED] Initializing skill library...");
    const skills = [
      { id: 'sk-01', name: 'Docker Ghost Image Purge', desc: 'Identifies and removes dangling images and containers.', lang: 'bash', ver: '1.2.0' },
      { id: 'sk-02', name: 'Nginx Configuration Hardening', desc: 'Applies security headers and disables weak TLS.', lang: 'bash', ver: '2.0.1' },
      { id: 'sk-03', name: 'ZFS Pool Scrub & Verify', desc: 'Performs integrity check of the storage pool.', lang: 'bash', ver: '1.0.5' },
      { id: 'sk-04', name: 'Memory Leak Neural Detector', desc: 'Detects slow memory leaks using ARES patterns.', lang: 'bash', ver: '3.1.0' }
    ];
    const stmt = db.prepare("INSERT INTO skills (id, name, description, language, version) VALUES (?, ?, ?, ?, ?)");
    skills.forEach(s => stmt.run(s.id, s.name, s.desc, s.lang, s.ver));
  }

  // 6. Proactive Activities
  const proactiveCount = db.prepare("SELECT count(*) as count FROM proactive_activities").get() as { count: number };
  if (proactiveCount.count === 0) {
    db.prepare("INSERT INTO proactive_activities (id, name, skillId, condition, schedule, targetType, targets) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      crypto.randomUUID(), 'Weekly ZFS Scrub', 'sk-03', 'uptime > 168', '0 2 * * 0', 'group', '["db-cluster"]'
    );
  }

  // 7. Sample Incidents
  const incidentCount = db.prepare("SELECT count(*) as count FROM incidents").get() as { count: number };
  if (incidentCount.count === 0) {
    console.log("[SEED] Inserting sample incidents...");
    db.prepare(`INSERT INTO incidents (id, serverId, severity, title, description, status, timestamp) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        `inc-${Date.now()}`, 
        'srv-02', 
        'high',
        'Memory Utilization Critical', 
        'ARES node operating at 92% capacity.', 
        'open', 
        new Date().toISOString()
      );
  }

  console.log("[SEED] Database seeding completed.");
}
