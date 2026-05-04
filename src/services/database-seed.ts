import Database from "better-sqlite3";

/**
 * Seeds the database. Clean install = no admin, no sample data.
 * The admin user is created via the Onboarding Wizard (UI).
 * Skills are seeded from YAML definitions when the skills table is empty.
 */
export function seedDatabase(db: Database): void {
  console.log("[SEED] Clean install — zero data. Onboarding wizard will handle setup.");

  // ── Seed skills from YAML definitions if empty ────────────────────
  const existingSkills = db.prepare("SELECT COUNT(*) as c FROM skills").get() as { c: number };
  if (existingSkills.c === 0) {
    console.log("[SEED] No skills found — seeding default skills");

    const defaultSkills = [
      {
        id: "ps_remediation_v1",
        name: "PowerShell Remediation Expert",
        language: "powershell",
        version: "1.0",
        description: "Expert in Windows Server remediation",
        path: "SKILLS/powershell_remediation_v1/skill.yaml",
      },
      {
        id: "bash_remediation_v1",
        name: "Bash Linux Remediation",
        language: "bash",
        version: "1.0",
        description: "Expert in Linux system recovery",
        path: "SKILLS/bash_remediation_v1/skill.yaml",
      },
      {
        id: "windows_firewall_manager",
        name: "Windows Firewall Manager",
        language: "powershell",
        version: "1.0",
        description: "Manage Windows Firewall rules via netsh and PowerShell. List, add, remove inbound/outbound rules.",
        path: "SKILLS/windows_firewall_manager/skill.yaml",
      },
      {
        id: "windows_task_scheduler",
        name: "Windows Task Scheduler",
        language: "powershell",
        version: "1.0",
        description: "Manage scheduled tasks on Windows. List, create, enable, disable, delete tasks.",
        path: "SKILLS/windows_task_scheduler/skill.yaml",
      },
      {
        id: "windows_service_manager",
        name: "Windows Service Manager",
        language: "powershell",
        version: "1.0",
        description: "Manage Windows services — list, start, stop, restart, enable, disable, and query service status.",
        path: "SKILLS/windows_service_manager/skill.yaml",
      },
      {
        id: "windows_event_log_reader",
        name: "Windows Event Log Reader",
        language: "powershell",
        version: "1.0",
        description: "Read and query Windows Event Logs — system, application, security, and custom logs with filters.",
        path: "SKILLS/windows_event_log_reader/skill.yaml",
      },
    ];

    const insert = db.prepare(
      "INSERT INTO skills (id, name, language, version, description, path) VALUES (?, ?, ?, ?, ?, ?)"
    );

    for (const skill of defaultSkills) {
      try {
        insert.run(skill.id, skill.name, skill.language, skill.version, skill.description, skill.path);
        console.log(`[SEED] Seeded skill: ${skill.name}`);
      } catch (e: any) {
        console.warn(`[SEED] Could not seed skill ${skill.name}: ${e.message}`);
      }
    }
  }
}
