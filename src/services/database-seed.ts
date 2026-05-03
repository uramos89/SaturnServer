import Database from "better-sqlite3";
import crypto from "crypto";

/**
 * Seeds the database with only the essential admin user.
 * No sample data, dummy servers, or fake incidents.
 * A clean install = a clean slate.
 */
export function seedDatabase(db: Database): void {
  console.log("[SEED] Checking database state...");

  // 1. Initial Admin User (needed for first login)
  const adminExists = db.prepare("SELECT count(*) as count FROM users WHERE username = 'admin'").get() as { count: number };
  if (adminExists.count === 0) {
    console.log("[SEED] Creating default admin user...");
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync("admin12345", salt, 100000, 64, "sha512").toString("hex");
    const passwordHash = `${salt}:${hash}`;
    
    db.prepare("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(crypto.randomUUID(), "admin", passwordHash, "administrator", new Date().toISOString());
    console.log("[SEED] Default admin created: admin / admin12345");
  }

  console.log("[SEED] Clean install — zero sample data. All setup via onboarding wizard.");
}
