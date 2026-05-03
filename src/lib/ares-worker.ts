import type { Database } from "better-sqlite3";
import { SSHAgent } from "./ssh-agent.js";
import { writeAuditLog } from "./contextp-service.js";
import { sendNotification } from "../services/notification-service.js";

interface ProactiveActivity {
  id: string;
  name: string;
  skillId: string;
  condition: string;
  schedule: string;
  targetType: string;
  targets: string | null;
  enabled: number;
  last_run: string | null;
  created_at: string;
}

interface ManagedServer {
  id: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  os: string;
  status: string;
  cpu: number;
  memory: number;
  disk: number;
}

function parseScheduleToMs(schedule: string): number {
  const match = schedule.match(/^(\d+)\s*(m|min|h|hour|s|sec)?$/i);
  if (!match) return 5 * 60 * 1000;
  const value = parseInt(match[1]);
  const unit = (match[2] || "m").toLowerCase();
  switch (unit) {
    case "s": case "sec": return value * 1000;
    case "m": case "min": return value * 60 * 1000;
    case "h": case "hour": return value * 3600 * 1000;
    default: return value * 60 * 1000;
  }
}

function evaluateCondition(condition: string, metrics: { cpu: number; memory: number; disk: number }): { met: boolean; value: number; threshold: number } {
  const match = condition.match(/^(cpu|memory|disk)\s*(>|<|>=|<=|==)\s*(\d+)/i);
  if (!match) return { met: false, value: 0, threshold: 0 };
  const metric = match[1].toLowerCase();
  const operator = match[2];
  const threshold = parseInt(match[3]);
  const value = metrics[metric as keyof typeof metrics] || 0;
  let met = false;
  switch (operator) {
    case ">": met = value > threshold; break;
    case "<": met = value < threshold; break;
    case ">=": met = value >= threshold; break;
    case "<=": met = value <= threshold; break;
    case "==": met = value === threshold; break;
  }
  return { met, value, threshold };
}

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
    this.db.prepare("UPDATE incidents SET status = 'open' WHERE status = 'analyzing'").run();
    this.interval = setInterval(() => this.processCycle(), intervalMs);
    setTimeout(() => this.processCycle(), 5000);
  }

  stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  async processCycle() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      await this.processIncidents();
      await this.processProactiveActivities();
    } catch (error) {
      console.error("[ARES] Error in processing cycle:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  // ── EXISTING: Process open incidents ──────────────────────────────
  private async processIncidents() {
    const openIncidents = this.db.prepare("SELECT * FROM incidents WHERE status = 'open'").all() as any[];
    for (const incident of openIncidents) {
      try { await this.analyzeIncident(incident); }
      catch (err) { console.error(`[ARES] Fatal error analyzing incident ${incident.id}:`, err); }
    }
  }

  // ── NEW: Proactive Activities Engine ───────────────────────────────
  private async processProactiveActivities() {
    const activities = this.db.prepare(
      "SELECT * FROM proactive_activities WHERE enabled = 1 ORDER BY last_run ASC"
    ).all() as ProactiveActivity[];

    for (const activity of activities) {
      try { await this.evaluateAndRun(activity); }
      catch (err) { console.error(`[ARES] Error processing activity "${activity.name}":`, err); }
    }
  }

  private async evaluateAndRun(activity: ProactiveActivity) {
    if (!this.isTimeToRun(activity)) return;

    const servers = this.getTargetServers(activity);
    if (servers.length === 0) {
      console.log(`[ARES] No target servers for "${activity.name}"`);
      return;
    }

    console.log(`[ARES] Running "${activity.name}" on ${servers.length} server(s)`);

    for (const server of servers) {
      const historyId = `proexec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      this.db.prepare(
        `INSERT INTO proactive_execution_history (id, activityId, activityName, serverId, condition, status) VALUES (?, ?, ?, ?, ?, 'running')`
      ).run(historyId, activity.id, activity.name, server.id, activity.condition);

      try {
        // Evaluate condition using stored metrics
        const metrics = this.getServerMetrics(server);
        const result = evaluateCondition(activity.condition, metrics);

        this.db.prepare(
          `UPDATE proactive_execution_history SET conditionMet = ?, output = ? WHERE id = ?`
        ).run(result.met ? 1 : 0,
          `Condition: ${activity.condition} => value=${result.value}, threshold=${result.threshold}, met=${result.met}`,
          historyId
        );

        if (!result.met) {
          this.db.prepare("UPDATE proactive_activities SET last_run = ? WHERE id = ?")
            .run(new Date().toISOString(), activity.id);
          this.db.prepare("UPDATE proactive_execution_history SET status = 'skipped', executed_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(historyId);
          continue;
        }

        // Condition met — execute skill
        const skill = this.db.prepare("SELECT * FROM skills WHERE id = ?").get(activity.skillId) as any;
        if (!skill) throw new Error(`Skill '${activity.skillId}' not found`);

        let output = "(no SSH connection available — condition was met)";
        let status = "warning";

        // Try executing via existing SSH connection
        try {
          const conns = this.db.prepare(
            "SELECT * FROM ssh_connections WHERE serverId = ? AND status = 'connected' ORDER BY created_at DESC LIMIT 1"
          ).all(server.id) as any[];

          if (conns.length > 0) {
            const connKey = `${server.id}:${server.ip}`;
            const cmd = skill.script || `echo "Skill ${skill.name} triggered for condition ${activity.condition}"`;
            const execResult = await this.sshAgent.execCommand(connKey, cmd);
            output = execResult.stdout || execResult.stderr || "(no output)";
            status = "success";
          }
        } catch (execErr: any) {
          output = `SSH exec failed: ${execErr.message}`;
          status = "failed";
        }

        this.db.prepare(
          `UPDATE proactive_execution_history SET status = ?, script = ?, output = ?, executed_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).run(status, skill.script || "", output, historyId);

        this.db.prepare("UPDATE proactive_activities SET last_run = ? WHERE id = ?")
          .run(new Date().toISOString(), activity.id);

        console.log(`[ARES] "${activity.name}" => ${status} on ${server.name}`);

      } catch (err: any) {
        console.error(`[ARES] Failed "${activity.name}" on ${server.name}:`, err.message);
        this.db.prepare(
          `UPDATE proactive_execution_history SET status = 'failed', error = ?, executed_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).run(err.message.slice(0, 500), historyId);

        // Send notification on failure
        sendNotification(this.db, 'proactive_failed',
          `⚠️ Proactive activity failed: ${activity.name}`,
          `Activity "${activity.name}" failed on ${server.name}: ${err.message}`,
          'warning',
          { activityId: activity.id, serverId: server.id, historyId }
        ).catch(e => console.error('[NOTIFY] Failed to send failure notification:', e.message));
      }
    }
  }

  private isTimeToRun(activity: ProactiveActivity): boolean {
    if (!activity.last_run) return true;
    const intervalMs = parseScheduleToMs(activity.schedule);
    return (Date.now() - new Date(activity.last_run).getTime()) >= intervalMs;
  }

  private getTargetServers(activity: ProactiveActivity): ManagedServer[] {
    if (activity.targetType === "all") {
      return this.db.prepare("SELECT * FROM servers").all() as ManagedServer[];
    }
    let serverIds: string[] = [];
    if (activity.targetType === "server" && activity.targets) {
      try { serverIds = JSON.parse(activity.targets); }
      catch { serverIds = [activity.targets]; }
    }
    if (serverIds.length === 0) return [];
    const placeholders = serverIds.map(() => "?").join(",");
    return this.db.prepare(`SELECT * FROM servers WHERE id IN (${placeholders})`).all(...serverIds) as ManagedServer[];
  }

  private getServerMetrics(server: ManagedServer): { cpu: number; memory: number; disk: number } {
    return { cpu: server.cpu || 0, memory: server.memory || 0, disk: server.disk || 0 };
  }

  // ── EXISTING: Analyze incident with AI ─────────────────────────────
  async analyzeIncident(incident: any) {
    console.log(`[ARES] Analyzing incident ${incident.id}: ${incident.title}`);
    const server = this.db.prepare("SELECT * FROM servers WHERE id = ?").get(incident.serverId) as any;
    if (!server) return;
    const obpaId = `obpa-${Date.now()}`;
    try {
      this.db.prepare(
        "INSERT INTO obpa_cycles (id, incidentId, phase, observation, timestamp) VALUES (?, ?, ?, ?, ?)"
      ).run(obpaId, incident.id, "OBSERVE",
        `Incident detected on ${server.name} (${server.ip}). Status: ${server.status}. Severity: ${incident.severity}.`,
        new Date().toISOString()
      );
      this.db.prepare("UPDATE incidents SET status = 'analyzing' WHERE id = ?").run(incident.id);
      const activeProvider = this.db.prepare("SELECT provider FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as any;
      const provider = activeProvider?.provider || process.env.AI_PROVIDER || "";
      if (!provider) {
        console.log(`[ARES] No AI provider configured. Incident ${incident.id} requires manual review.`);
        this.db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(incident.id);
        this.db.prepare("UPDATE obpa_cycles SET phase = 'PROPOSE', proposal = ?, confidence = ? WHERE id = ?")
          .run("Manual intervention required — configure an AI provider in Settings for automated analysis.", 0.0, obpaId);
        return;
      }
      const { getLLMResponse } = await import("../services/llm-service.js");
      const prompt = `You are ARES (Autonomous Remediation Engine for Saturn).
Analyze the following incident and propose a solution.
SERVER: ${server.name} (${server.os})
INCIDENT: ${incident.title} - ${incident.description}
SEVERITY: ${incident.severity}
Propose a remediation plan. If possible, provide a script (Bash for Linux, PowerShell for Windows).
Return your response in JSON format:
{ "analysis": "string", "proposal": "string", "script": "string (the code only)", "confidence": number (0.0 to 1.0) }`;
      const aiResponseRaw = await getLLMResponse(provider, prompt);
      let aiResult;
      try {
        const jsonMatch = aiResponseRaw.match(/\{[\s\S]*\}/);
        aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponseRaw);
      } catch (e) {
        aiResult = { analysis: aiResponseRaw, proposal: "Manual intervention required", script: "", confidence: 0.1 };
      }
      this.db.prepare("UPDATE obpa_cycles SET phase = 'PROPOSE', proposal = ?, remediation_script = ?, confidence = ? WHERE id = ?")
        .run(aiResult.proposal, aiResult.script, aiResult.confidence, obpaId);
      this.db.prepare("UPDATE incidents SET status = 'closed' WHERE id = ?").run(incident.id);
      console.log(`[ARES] Incident ${incident.id} resolved via ${provider}.`);
      writeAuditLog({
        id: obpaId, date: new Date().toISOString(), type: "success", domain: "NEURAL",
        title: `ARES Analysis Completed: ${incident.title}`,
        detail: `ARES (${provider}) proposed a solution with ${Math.round(aiResult.confidence * 100)}% confidence.`
      });
    } catch (e: any) {
      console.error(`[ARES] Failed to analyze incident ${incident.id}:`, e.message);
      this.db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(incident.id);
    }
  }

  async wakeUp() {
    await this.processCycle();
  }
}
