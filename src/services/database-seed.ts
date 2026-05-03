import Database from "better-sqlite3";

/**
 * Seeds the database. Clean install = no admin, no sample data.
 * The admin user is created via the Onboarding Wizard (UI).
 */
export function seedDatabase(db: Database): void {
  console.log("[SEED] Clean install — zero data. Onboarding wizard will handle setup.");
}
