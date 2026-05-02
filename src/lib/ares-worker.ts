import type { Database } from "better-sqlite3";
import { SSHAgent } from "./ssh-agent.js";
import { ScriptGenerator } from "./script-generator.js";
import { writeAuditLog } from "./contextp-service.js";

export class ARESWorker {
  private db: Database;
  private sshAgent: SSHAgent;
  private interval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(db: Database, sshAgent: SSHAgent) {
    this.db = db;
    this.sshAgent = sshAgent;
  }

  start(intervalMs = 60000) {
    if (this.interval) return;
    console.log(`[ARES] Neural Core Worker started (Interval: ${intervalMs}ms)`);
    this.interval = setInterval(() => this.processCycle(), intervalMs);
    // Initial run
    setTimeout(() => this.processCycle(), 5000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async processCycle() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const openIncidents = this.db.prepare("SELECT * FROM incidents WHERE status = 'open'").all() as any[];
      
      for (const incident of openIncidents) {
        await this.analyzeIncident(incident);
      }
    } catch (error) {
      console.error("[ARES] Error in processing cycle:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  async analyzeIncident(incident: any) {
    console.log(`[ARES] Analyzing incident ${incident.id}: ${incident.title}`);
    
    // 1. Observe: Gather context
    const server = this.db.prepare("SELECT * FROM servers WHERE id = ?").get(incident.serverId) as any;
    if (!server) return;

    const obpaId = `obpa-${Date.now()}`;
    
    try {
      this.db.prepare(`INSERT INTO obpa_cycles (id, incidentId, phase, observation, timestamp) 
        VALUES (?, ?, ?, ?, ?)`).run(
          obpaId, incident.id, "OBSERVE", 
          `Incident detected on ${server.name} (${server.ip}). Status: ${server.status}. Severity: ${incident.severity}.`,
          new Date().toISOString()
        );

      // 2. Propose (Placeholder for AI logic integration)
      this.db.prepare("UPDATE incidents SET status = 'analyzing' WHERE id = ?").run(incident.id);
      
      console.log(`[ARES] Incident ${incident.id} marked as analyzing.`);

      writeAuditLog({
        id: obpaId,
        date: new Date().toISOString(),
        type: "success",
        domain: "TECH",
        title: `ARES Analysis Started: ${incident.title}`,
        detail: `ARES Neural Core is analyzing incident ${incident.id} for server ${server.name}.`
      });
    } catch (e: any) {
      console.error(`[ARES] Failed to analyze incident ${incident.id}:`, e.message);
    }
  }

  // Hook for manual/immediate trigger
  async wakeUp() {
    await this.processCycle();
  }
}
