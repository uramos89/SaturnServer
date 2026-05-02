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

      // 2. Propose: Use AI to analyze and generate remediation
      this.db.prepare("UPDATE incidents SET status = 'analyzing' WHERE id = ?").run(incident.id);
      
      const prompt = `You are ARES (Autonomous Remediation Engine for Saturn). 
Analyze the following incident and propose a solution.
SERVER: ${server.name} (${server.os})
INCIDENT: ${incident.title} - ${incident.description}
SEVERITY: ${incident.severity}

Propose a remediation plan. If possible, provide a script (Bash for Linux, PowerShell for Windows).
Return your response in JSON format:
{
  "analysis": "string",
  "proposal": "string",
  "script": "string (the code only)",
  "confidence": number (0.0 to 1.0)
}`;

      // Use the centralized LLM service with the provider configured by the user
      const activeProvider = this.db.prepare("SELECT provider FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as any;
      const provider = activeProvider?.provider || process.env.AI_PROVIDER || "gemini";
      
      const { getLLMResponse } = await import("../services/llm-service.js");
      const aiResponseRaw = await getLLMResponse(provider, prompt);
      
      let aiResult;
      try {
        // AI might return markdown, clean it
        const jsonMatch = aiResponseRaw.match(/\{[\s\S]*\}/);
        aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponseRaw);
      } catch (e) {
        aiResult = { analysis: aiResponseRaw, proposal: "Manual intervention required", script: "", confidence: 0.1 };
      }

      this.db.prepare(`UPDATE obpa_cycles SET 
        phase = 'PROPOSE', 
        proposal = ?, 
        remediation_script = ?, 
        confidence = ? 
        WHERE id = ?`).run(
          aiResult.proposal,
          aiResult.script,
          aiResult.confidence,
          obpaId
        );

      console.log(`[ARES] Incident ${incident.id} analyzed by Moonshot AI.`);

      writeAuditLog({
        id: obpaId,
        date: new Date().toISOString(),
        type: "success",
        domain: "NEURAL",
        title: `ARES Analysis Completed: ${incident.title}`,
        detail: `ARES (Moonshot) proposed a solution with ${Math.round(aiResult.confidence * 100)}% confidence.`
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
