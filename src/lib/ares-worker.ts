import type { Database } from "better-sqlite3";
import { SSHAgent } from "./ssh-agent.js";
import { writeAuditLog } from "./contextp-service.js";
import { sendNotification } from "../services/notification-service.js";

// ── Interfaces ──────────────────────────────────────────────────────────
interface ProactiveActivity {
  id: string; name: string; skillId: string; condition: string;
  schedule: string; targetType: string; targets: string | null;
  enabled: number; last_run: string | null; created_at: string;
}
interface ManagedServer {
  id: string; name: string; ip: string; port: number; username: string;
  os: string; status: string; cpu: number; memory: number; disk: number;
}
interface AegisCacheEntry { cache_key: string; skill_script: string; skill_metadata: string; created_at: string; ttl_minutes: number; }

// ── Configuración ───────────────────────────────────────────────────────
const CONFIG = {
  MAX_AUTO_SKILLS: 500,        // Límite configurable de skills auto-generadas
  CACHE_TTL_MINUTES: 60,       // Cache de skills repetidas
  MAX_GENERATIONS: 3,          // Máximo generaciones por incidente
  COOLDOWN_MS: 10 * 60 * 1000, // 10 min cooldown tras 3 fallos
  PROMOTE_THRESHOLD: 0.8,      // 80% éxito para promover a permanente
  PROMOTE_MIN_EXECUTIONS: 5,   // Mínimo 5 ejecuciones para promover
  DRY_RUN_ENABLED: true,       // Dry-run obligatorio
  CHUNK_MAX_LINES: 100,        // Chunking para skills grandes
};

// ── Helpers ─────────────────────────────────────────────────────────────
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

function classifyIncidentDomain(title: string, description: string): string {
  const t = (title + " " + description).toLowerCase();
  if (t.includes("cpu") && t.includes("process")) return "cpu.process";
  if (t.includes("cpu") && t.includes("kernel")) return "cpu.system.kernel";
  if (t.includes("cpu") && t.includes("load")) return "cpu.system.load";
  if (t.includes("cpu")) return "cpu.generic";
  if (t.includes("memory") && t.includes("leak")) return "memory.process.leak";
  if (t.includes("memory")) return "memory.generic";
  if (t.includes("disk") && t.includes("full")) return "disk.fs.mount_full";
  if (t.includes("disk") && t.includes("i/o")) return "disk.io.saturation";
  if (t.includes("disk")) return "disk.generic";
  if (t.includes("process") && t.includes("crash")) return "process.crash";
  if (t.includes("process") && t.includes("zombie")) return "process.zombie";
  if (t.includes("process")) return "process.generic";
  if (t.includes("network") && t.includes("timeout")) return "network.timeout";
  if (t.includes("network") && t.includes("port")) return "network.port";
  if (t.includes("network")) return "network.generic";
  return "unknown.generic";
}

function classifyServerType(os: string): "linux" | "windows" {
  return os?.toLowerCase().includes("win") ? "windows" : "linux";
}

// ── Fallbacks deterministas (respuesta inmediata mientras se genera skill) ──
function getDeterministicFallback(domain: string, os: "linux" | "windows"): { script: string; description: string } {
  const fallbacks: Record<string, { linux: string; windows: string }> = {
    "cpu.generic": {
      linux: '#!/bin/bash\necho "[FALLBACK] CPU high detected — collecting top processes..."; ps aux --sort=-%cpu | head -10; echo "[FALLBACK] Consider: kill high-consumption PIDs above"; echo "ACTION REQUIRED: Review processes above"',
      windows: '@echo off\r\npowershell -Command "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table Name, Id, CPU, WorkingSet -AutoSize"\r\necho [FALLBACK] Review processes above',
    },
    "memory.generic": {
      linux: '#!/bin/bash\necho "[FALLBACK] Memory high — checking top consumers..."; ps aux --sort=-%mem | head -10; free -m; echo "ACTION: Review processes above"',
      windows: '@echo off\r\npowershell -Command "Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10 | Format-Table Name, Id, WorkingSet -AutoSize"\r\necho [FALLBACK] Review processes above',
    },
    "disk.fs.mount_full": {
      linux: '#!/bin/bash\necho "[FALLBACK] Disk full — checking usage..."; df -h; echo "ACTION: Clean up old logs/files in largest directories"; du -sh /* 2>/dev/null | sort -rh | head -10',
      windows: '@echo off\r\npowershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N=\\"UsedGB\\";E={[math]::Round($_.Used/1GB,2)}}, @{N=\\"FreeGB\\";E={[math]::Round($_.Free/1GB,2)}}"',
    },
    "process.crash": {
      linux: '#!/bin/bash\necho "[FALLBACK] Process crash — checking systemd services..."; systemctl --failed; journalctl -p err -b --no-pager | tail -20',
      windows: '@echo off\r\npowershell -Command "Get-EventLog -LogName Application -EntryType Error -Newest 20 | Format-Table TimeGenerated, Source, Message -AutoSize -Wrap"',
    },
  };

  const fb = fallbacks[domain] || fallbacks["cpu.generic"];
  return {
    script: os === "windows" ? fb.windows : fb.linux,
    description: `Fallback determinista para ${domain} en ${os}`,
  };
}

// ── Clase principal ARESWorker ─────────────────────────────────────────
export class ARESWorker {
  private db: Database;
  private sshAgent: SSHAgent;
  private interval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(db: Database, sshAgent: SSHAgent) {
    this.db = db;
    this.sshAgent = sshAgent;
  }

  // ── Ciclo de vida ──────────────────────────────────────────────────
  start(intervalMs = 60000) {
    if (this.interval) return;
    console.log(`[ARES] Neural Core Worker started (Interval: ${intervalMs}ms)`);
    console.log(`[ARES] Aegis Auto-Generation Pipeline ACTIVE`);
    console.log(`[ARES] Max auto-skills: ${CONFIG.MAX_AUTO_SKILLS}, Cache TTL: ${CONFIG.CACHE_TTL_MINUTES}min, Dry-run: ${CONFIG.DRY_RUN_ENABLED}`);

    this.db.prepare("UPDATE incidents SET status = 'open' WHERE status = 'analyzing'").run();
    this.purgeInteligente(); // Purga al inicio

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

  // ── Purga inteligente de skills auto-generadas ─────────────────────
  private purgeInteligente() {
    try {
      // Contar skills auto-generadas
      const count = (this.db.prepare(
        "SELECT COUNT(*) as c FROM skills WHERE id LIKE 'auto-%'"
      ).get() as any)?.c || 0;

      if (count <= CONFIG.MAX_AUTO_SKILLS) return;

      const excess = count - CONFIG.MAX_AUTO_SKILLS + 10; // +10 buffer
      console.log(`[ARES] Purging ${excess} auto-skills (${count}/${CONFIG.MAX_AUTO_SKILLS} limit)`);

      // Prioridad de purga:
      // 1. Skills con 0 ejecuciones
      // 2. Skills con < 10% éxito y > 3 ejecuciones
      // 3. Skills con < 30% éxito
      // 4. Las más antiguas
      this.db.exec(`
        DELETE FROM skills WHERE id LIKE 'auto-%' AND id IN (
          SELECT s.id FROM skills s
          LEFT JOIN (
            SELECT skill_id, COUNT(*) as execs,
                   AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0 END) as success_rate
            FROM proactive_execution_history GROUP BY skill_id
          ) h ON s.id = h.skill_id
          WHERE s.id LIKE 'auto-%'
          ORDER BY
            CASE WHEN h.execs IS NULL OR h.execs = 0 THEN 0 ELSE 1 END,
            CASE WHEN h.execs > 3 AND (h.success_rate IS NULL OR h.success_rate < 0.1) THEN 0 ELSE 1 END,
            CASE WHEN h.success_rate < 0.3 THEN 0 ELSE 1 END,
            s.created_at ASC
          LIMIT ${excess}
        )
      `);
      console.log(`[ARES] Purge complete. Auto-skills remaining: ${
        (this.db.prepare("SELECT COUNT(*) as c FROM skills WHERE id LIKE 'auto-%'").get() as any)?.c
      }`);
    } catch (e: any) {
      console.error("[ARES] Purge error:", e.message);
    }
  }

  // ── Procesar incidentes ────────────────────────────────────────────
  private async processIncidents() {
    const openIncidents = this.db.prepare(
      "SELECT * FROM incidents WHERE status = 'open' ORDER BY timestamp ASC"
    ).all() as any[];
    for (const incident of openIncidents) {
      try { await this.analyzeIncident(incident); }
      catch (err) { console.error(`[ARES] Fatal error analyzing incident ${incident.id}:`, err); }
    }
  }

  // ── Procesar actividades proactivas ─────────────────────────────────
  private async processProactiveActivities() {
    const activities = this.db.prepare(
      "SELECT * FROM proactive_activities WHERE enabled = 1 ORDER BY last_run ASC"
    ).all() as ProactiveActivity[];
    for (const activity of activities) {
      try { await this.evaluateAndRun(activity); }
      catch (err) { console.error(`[ARES] Error processing activity "${activity.name}":`, err); }
    }
  }

  // ── Evaluar y ejecutar actividad proactiva ──────────────────────────
  private async evaluateAndRun(activity: ProactiveActivity) {
    if (!this.isTimeToRun(activity)) return;

    const servers = this.getTargetServers(activity);
    if (servers.length === 0) return;

    for (const server of servers) {
      const historyId = `proexec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      this.db.prepare(
        `INSERT INTO proactive_execution_history (id, activityId, activityName, serverId, condition, status) VALUES (?, ?, ?, ?, ?, 'running')`
      ).run(historyId, activity.id, activity.name, server.id, activity.condition);

      try {
        const metrics = this.getServerMetrics(server);
        const result = evaluateCondition(activity.condition, metrics);
        this.db.prepare(`UPDATE proactive_execution_history SET conditionMet = ?, output = ? WHERE id = ?`)
          .run(result.met ? 1 : 0,
            `Condition: ${activity.condition} => value=${result.value}, threshold=${result.threshold}, met=${result.met}`,
            historyId);
        if (!result.met) {
          this.db.prepare("UPDATE proactive_activities SET last_run = ? WHERE id = ?")
            .run(new Date().toISOString(), activity.id);
          this.db.prepare("UPDATE proactive_execution_history SET status = 'skipped', executed_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(historyId);
          continue;
        }

        const skill = this.db.prepare("SELECT * FROM skills WHERE id = ?").get(activity.skillId) as any;
        if (!skill) throw new Error(`Skill '${activity.skillId}' not found`);

        let output = "(no SSH connection available)";
        let status = "warning";

        try {
          const conns = this.db.prepare(
            "SELECT * FROM ssh_connections WHERE serverId = ? AND status = 'connected' ORDER BY created_at DESC LIMIT 1"
          ).all(server.id) as any[];
          if (conns.length > 0) {
            const connKey = `${server.id}:${server.ip}`;
            const cmd = skill.script || `echo "Skill ${skill.name} triggered"`;
            const execResult = await this.sshAgent.execCommand(connKey, cmd);
            output = execResult.stdout || execResult.stderr || "(no output)";
            status = "success";
          }
        } catch (execErr: any) {
          output = `SSH exec failed: ${execErr.message}`;
          status = "failed";
        }

        this.db.prepare(`UPDATE proactive_execution_history SET status = ?, script = ?, output = ?, executed_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(status, skill.script || "", output, historyId);
        this.db.prepare("UPDATE proactive_activities SET last_run = ? WHERE id = ?")
          .run(new Date().toISOString(), activity.id);

        // Promover skill si cumple umbral
        this.tryPromoteSkill(skill.id);
      } catch (err: any) {
        this.db.prepare(`UPDATE proactive_execution_history SET status = 'failed', error = ?, executed_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(err.message.slice(0, 500), historyId);
        sendNotification(this.db, 'proactive_failed',
          `⚠️ Proactive activity failed: ${activity.name}`,
          `Failed on ${server.name}: ${err.message}`, 'warning',
          { activityId: activity.id, serverId: server.id, historyId }
        ).catch(() => {});
      }
    }
  }

  // ── Anti-recurrencia ───────────────────────────────────────────────
  private checkAntiRecurrencia(incidentId: string, serverId: string): { allowed: boolean; reason?: string; iteration: number } {
    const gens = this.db.prepare(
      "SELECT * FROM aegis_generations WHERE incident_id = ? ORDER BY iteration DESC LIMIT 1"
    ).get(incidentId) as any;

    if (!gens) return { allowed: true, iteration: 1 };

    // Max 3 generaciones por incidente
    if (gens.iteration >= CONFIG.MAX_GENERATIONS) {
      return { allowed: false, reason: `Max ${CONFIG.MAX_GENERATIONS} generations per incident reached`, iteration: gens.iteration };
    }

    // Cooldown de 10 min tras fallos consecutivos
    if (gens.status === 'failed') {
      const lastFail = new Date(gens.created_at).getTime();
      if (Date.now() - lastFail < CONFIG.COOLDOWN_MS) {
        return { allowed: false, reason: `Cooldown active (${Math.round((CONFIG.COOLDOWN_MS - (Date.now() - lastFail)) / 1000)}s remaining)`, iteration: gens.iteration };
      }
    }

    return { allowed: true, iteration: gens.iteration + 1 };
  }

  // ── Cache de skills ────────────────────────────────────────────────
  private checkCache(domain: string, serverId: string): AegisCacheEntry | null {
    const cacheKey = `${domain}:${serverId}`;
    const entry = this.db.prepare(
      "SELECT * FROM aegis_cache WHERE cache_key = ? AND created_at > datetime('now', '-' || ttl_minutes || ' minutes')"
    ).get(cacheKey) as AegisCacheEntry | null;
    return entry;
  }

  private storeCache(domain: string, serverId: string, skillScript: string, skillMetadata: string) {
    const cacheKey = `${domain}:${serverId}`;
    this.db.prepare(
      "INSERT OR REPLACE INTO aegis_cache (cache_key, skill_script, skill_metadata, ttl_minutes) VALUES (?, ?, ?, ?)"
    ).run(cacheKey, skillScript, skillMetadata, CONFIG.CACHE_TTL_MINUTES);
  }

  // ── Análisis de incidente con Aegis ─────────────────────────────────
  async analyzeIncident(incident: any) {
    const domain = classifyIncidentDomain(incident.title, incident.description);
    const os = classifyServerType(incident.os || "linux");
    console.log(`[ARES] Analyzing incident ${incident.id} (domain: ${domain})`);

    const server = this.db.prepare("SELECT * FROM servers WHERE id = ?").get(incident.serverId) as any;
    if (!server) return;

    const obpaId = `obpa-${Date.now()}`;

    try {
      // PASO 0: Ejecutar fallback determinista INMEDIATO
      const fallback = getDeterministicFallback(domain, os);
      console.log(`[ARES] Executing deterministic fallback for ${domain} (while Aegis generates skill in background)`);
      this.tryExecOnServer(incident.serverId, fallback.script);
      // El fallback se registra como medida inmediata
      this.db.prepare("INSERT INTO obpa_cycles (id, incidentId, phase, observation, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(obpaId, incident.id, "OBSERVE",
          `Fallback determinista ejecutado en ${server.name}. Dominio: ${domain}. OS: ${os}.`,
          new Date().toISOString()
        );

      // PASO 1: Buscar skill existente por dominio jerárquico
      this.db.prepare("UPDATE incidents SET status = 'analyzing' WHERE id = ?").run(incident.id);

      // Buscar skills por dominio (de más específico a más genérico)
      const domainParts = domain.split(".");
      let existingSkill: any = null;
      for (let i = domainParts.length; i > 0; i--) {
        const searchDomain = domainParts.slice(0, i).join(".");
        existingSkill = this.db.prepare(
          "SELECT * FROM skills WHERE (id LIKE 'skill-%' OR id LIKE 'persistent-%') AND (description LIKE ? OR id LIKE ?) AND enabled = 1 LIMIT 1"
        ).get(`%${searchDomain}%`, `%${searchDomain}%`) as any;
        if (existingSkill) break;
      }

      if (existingSkill) {
        console.log(`[ARES] Found existing skill '${existingSkill.name}' for domain '${domain}'`);
        // Ejecutar skill existente
        const result = await this.tryExecOnServer(incident.serverId, existingSkill.script || "");
        this.db.prepare("UPDATE obpa_cycles SET phase = 'PROPOSE', proposal = ?, confidence = ? WHERE id = ?")
          .run(`Skill existente '${existingSkill.name}' ejecutada: ${result.output}`, 0.9, obpaId);
        this.db.prepare("UPDATE incidents SET status = 'closed' WHERE id = ?").run(incident.id);
        return;
      }

      // PASO 2: Verificar anti-recurrencia
      const recurrencia = this.checkAntiRecurrencia(incident.id, incident.serverId);
      if (!recurrencia.allowed) {
        console.log(`[ARES] Anti-recurrencia: ${recurrencia.reason}`);
        this.db.prepare("UPDATE obpa_cycles SET phase = 'PROPOSE', proposal = ?, confidence = ? WHERE id = ?")
          .run(`Anti-recurrencia: ${recurrencia.reason}`, 0.0, obpaId);
        this.db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(incident.id);
        return;
      }

      // PASO 3: Verificar cache
      const cached = this.checkCache(domain, incident.serverId);
      if (cached) {
        console.log(`[ARES] Cache hit for ${domain} on ${incident.serverId}`);
        const result = await this.tryExecOnServer(incident.serverId, cached.skill_script);
        this.db.prepare("UPDATE obpa_cycles SET phase = 'PROPOSE', proposal = ?, confidence = ? WHERE id = ?")
          .run(`Skill cacheada ejecutada: ${result.output}`, 0.85, obpaId);
        this.db.prepare("UPDATE incidents SET status = 'closed' WHERE id = ?").run(incident.id);
        return;
      }

      // PASO 4: Generar nueva skill vía Aegis
      console.log(`[ARES] No skill found for '${domain}'. Invoking Aegis Auto-Generation...`);
      const generationId = `aegis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Obtener ContextP
      const contracts = this.db.prepare("SELECT content FROM contextp_entries WHERE path LIKE '%CONTRACTS%'").all() as any[];
      const rootContract = contracts.find((c: any) => c.path?.includes("ROOT_CONTRACT"))?.content || "(no ROOT_CONTRACT)";

      // Obtener AI provider activo
      const activeProvider = (this.db.prepare("SELECT provider FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as any)?.provider
        || process.env.AI_PROVIDER || "";
      if (!activeProvider) {
        console.log(`[ARES] No AI provider configured. Incident requires manual review.`);
        this.db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(incident.id);
        this.db.prepare("UPDATE obpa_cycles SET phase = 'PROPOSE', proposal = ?, confidence = ? WHERE id = ?")
          .run("No AI provider — configure one for auto-generation.", 0.0, obpaId);
        return;
      }

      // Construir prompt para Aegis
      const prompt = this.buildAegisPrompt(incident, server, domain, rootContract);

      // Llamar a la IA (con fallback a local si cloud falla)
      const { getLLMResponse } = await import("../services/llm-service.js");
      let aiResponse: string;
      try {
        aiResponse = await getLLMResponse(activeProvider, prompt);
      } catch (cloudErr: any) {
        console.warn(`[ARES] Cloud AI failed (${cloudErr.message}), trying local fallback...`);
        // Intentar con Ollama local como fallback
        try {
          aiResponse = await getLLMResponse("ollama", prompt);
        } catch (localErr: any) {
          throw new Error(`Both cloud and local AI failed. Cloud: ${cloudErr.message}, Local: ${localErr.message}`);
        }
      }

      // Parsear respuesta
      let aiResult: any;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
      } catch {
        aiResult = { analysis: aiResponse, proposal: "Could not parse AI response", script: "", confidence: 0.1 };
      }

      const newSkillId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const skillScript = aiResult.script || fallback.script;
      const skillDescription = aiResult.analysis || `Auto-generated skill for ${domain}`;

      // Validar la skill antes de ejecutar
      const { ScriptValidator } = await import("./script-validator.js");
      const validation = ScriptValidator.validate(skillScript, os === "windows" ? "powershell" : "bash");

      if (!validation.success && validation.errors.length > 0) {
        console.warn(`[ARES] Auto-generated skill failed validation: ${validation.errors.join("; ")}`);
        // Guardar la skill como fallida pero no ejecutar
        this.db.prepare("INSERT INTO skills (id, name, language, version, description, script, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
          .run(newSkillId, `Aegis: ${domain}`, os === "windows" ? "powershell" : "bash", "auto", skillDescription, skillScript, new Date().toISOString());
        this.db.prepare("UPDATE obpa_cycles SET phase = 'PROPOSE', proposal = ?, confidence = ? WHERE id = ?")
          .run(`Skill generada pero rechazada por validación: ${validation.errors.join("; ")}`, 0.3, obpaId);
        this.db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(incident.id);
        return;
      }

      // Chunking: si la skill es >100 líneas, dividir en pasos
      const scriptLines = skillScript.split("\n");
      const scriptsToExec = scriptLines.length > CONFIG.CHUNK_MAX_LINES
        ? this.chunkScript(skillScript, os === "windows" ? "powershell" : "bash")
        : [skillScript];

      // PASO 5: Dry-run antes de ejecución real
      if (CONFIG.DRY_RUN_ENABLED) {
        const dryCmd = os === "windows"
          ? `powershell -Command "${skillScript.replace(/"/g, '\\"')}" -WhatIf`
          : `bash -c '${skillScript.replace(/'/g, "'\\''")}' --dry-run 2>&1 || true`;
        try {
          const conns = this.db.prepare("SELECT * FROM ssh_connections WHERE serverId = ? AND status = 'connected' LIMIT 1").all(incident.serverId) as any[];
          if (conns.length > 0) {
            const connKey = `${incident.serverId}:${server.ip}`;
            await this.sshAgent.execCommand(connKey, `echo "[DRY-RUN] ${dryCmd.substring(0, 200)}..."`);
            console.log(`[ARES] Dry-run completed for ${newSkillId}`);
          }
        } catch (dryErr) {
          console.warn(`[ARES] Dry-run failed (non-blocking): ${dryErr}`);
        }
      }

      // Guardar la skill en DB
      this.db.prepare("INSERT INTO skills (id, name, language, version, description, script, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
        .run(newSkillId, `Aegis: ${domain}`, os === "windows" ? "powershell" : "bash", "auto", skillDescription, skillScript, new Date().toISOString());

      // Registrar generación
      this.db.prepare("INSERT INTO aegis_generations (id, incident_id, server_id, iteration, skill_id, status, prompt_sent, prompt_used, confidence) VALUES (?, ?, ?, ?, ?, 'generated', ?, ?, ?)")
        .run(generationId, incident.id, incident.serverId, recurrencia.iteration, newSkillId, prompt, JSON.stringify(aiResult), aiResult.confidence || 0.5);

      // Almacenar en cache
      this.storeCache(domain, incident.serverId, skillScript, JSON.stringify(aiResult));

      // Ejecutar la skill generada (en chunks si aplica)
      let execOutput = "";
      let execStatus = "success";
      for (const chunk of scriptsToExec) {
        const result = await this.tryExecOnServer(incident.serverId, chunk);
        execOutput += result.output + "\n";
        if (!result.success) { execStatus = "failed"; break; }
      }

      // Actualizar OBPA
      this.db.prepare("UPDATE obpa_cycles SET phase = 'PROPOSE', proposal = ?, remediation_script = ?, confidence = ? WHERE id = ?")
        .run(`Aegis generó skill '${newSkillId}'. ${execStatus === "success" ? "Ejecutada exitosamente." : "Falló durante ejecución."}`, skillScript, aiResult.confidence || 0.5, obpaId);
      this.db.prepare("UPDATE incidents SET status = 'closed' WHERE id = ?").run(incident.id);

      console.log(`[ARES] Aegis cycle complete: ${newSkillId} => ${execStatus}`);

      // Notificar
      sendNotification(this.db, 'aegis_skill_generated',
        `🧬 Aegis generó nueva skill: ${domain}`,
        `Skill '${newSkillId}' (${execStatus}) para ${server.name}. Dominio: ${domain}.`, 'info',
        { skillId: newSkillId, incidentId: incident.id, serverId: incident.serverId }
      ).catch(() => {});

      writeAuditLog({
        id: generationId, date: new Date().toISOString(), type: execStatus === "success" ? "success" : "warning",
        domain: "NEURAL",
        title: `Aegis Auto-Generation: ${domain}`,
        detail: `Generated skill '${newSkillId}' for ${server.name}. Iteration ${recurrencia.iteration}. Validation: ${validation.success}.`
      });

      // Promover si cumple
      this.tryPromoteSkill(newSkillId);

    } catch (e: any) {
      console.error(`[ARES] Aegis cycle failed: ${e.message}`);
      this.db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(incident.id);
      this.db.prepare("UPDATE obpa_cycles SET phase = 'PROPOSE', proposal = ?, confidence = ? WHERE id = ?")
        .run(`Aegis cycle failed: ${e.message}`, 0.0, obpaId);
    }
  }

  // ── Construir prompt para Aegis ────────────────────────────────────
  private buildAegisPrompt(incident: any, server: any, domain: string, rootContract: string): string {
    return `You are Aegis Architect v2, a meta-skill generator for Saturn Server.
Your task: Generate a new executable skill to resolve a server incident.

CONTEXT:
- Incident: ${incident.title} - ${incident.description}
- Domain: ${domain}
- Server: ${server.name} (${server.os}, IP: ${server.ip})
- Severity: ${incident.severity}
- Current metrics: CPU=${server.cpu}%, RAM=${server.memory}%, Disk=${server.disk}%

ROOT CONTRACT (constraints):
${rootContract.substring(0, 500)}

INSTRUCTIONS:
1. Analyze the incident and propose a remediation script.
2. The script must be ${server.os?.includes("win") ? "PowerShell" : "Bash"}.
3. Include safety checks (validate inputs, check preconditions).
4. Add a rollback section for undo.
5. Output ONLY valid JSON:
{
  "analysis": "Brief analysis of the root cause",
  "proposal": "Step-by-step remediation plan",
  "script": "The executable script (code only, no markdown)",
  "rollback": "Rollback/undo script",
  "confidence": 0.0-1.0
}`;
  }

  // ── Chunking de scripts grandes ────────────────────────────────────
  private chunkScript(script: string, language: string): string[] {
    const lines = script.split("\n");
    const chunks: string[] = [];
    const chunkSize = CONFIG.CHUNK_MAX_LINES;

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).join("\n");
      // Agregar checkpoint al inicio de cada chunk
      const header = language === "powershell"
        ? `# CHUNK ${chunks.length + 1}/${Math.ceil(lines.length / chunkSize)}\n# Checkpoint: if this fails, resume from here\n`
        : `#!/bin/bash\n# CHUNK ${chunks.length + 1}/${Math.ceil(lines.length / chunkSize)}\n# Checkpoint: if this fails, resume from here\nset -e\n`;
      chunks.push(header + chunk);
    }
    return chunks;
  }

  // ── Promover skill auto-generada a permanente ──────────────────────
  private tryPromoteSkill(skillId: string) {
    if (!skillId.startsWith("auto-")) return;
    const stats = this.db.prepare(`
      SELECT COUNT(*) as total, AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0 END) as success_rate
      FROM proactive_execution_history WHERE activityId = ?
    `).get(skillId) as any;
    if (!stats || stats.total < CONFIG.PROMOTE_MIN_EXECUTIONS) return;
    if (stats.success_rate >= CONFIG.PROMOTE_THRESHOLD) {
      const persistentId = skillId.replace("auto-", "persistent-");
      this.db.prepare("UPDATE skills SET id = ? WHERE id = ?")
        .run(persistentId, skillId);
      console.log(`[ARES] Skill ${skillId} PROMOTED to permanent (${persistentId}) — success rate: ${Math.round(stats.success_rate * 100)}%`);
      sendNotification(this.db, 'aegis_skill_promoted',
        `🏆 Skill promovida a permanente: ${skillId}`,
        `Skill de dominio alcanzó ${Math.round(stats.success_rate * 100)}% éxito en ${stats.total} ejecuciones.`, 'info',
        { skillId, persistentId }
      ).catch(() => {});
    }
  }

  // ── Ejecución en servidor ──────────────────────────────────────────
  private async tryExecOnServer(serverId: string, script: string): Promise<{ success: boolean; output: string }> {
    try {
      const server = this.db.prepare("SELECT * FROM servers WHERE id = ?").get(serverId) as any;
      if (!server) return { success: false, output: "Server not found" };
      const conns = this.db.prepare("SELECT * FROM ssh_connections WHERE serverId = ? AND status = 'connected' LIMIT 1").all(serverId) as any[];
      if (conns.length === 0) return { success: false, output: "No SSH connection" };
      const connKey = `${serverId}:${server.ip}`;
      const result = await this.sshAgent.execCommand(connKey, script);
      return { success: result.code === 0 || result.code === null, output: result.stdout || result.stderr };
    } catch (e: any) {
      return { success: false, output: e.message };
    }
  }

  // ── Helpers existentes ─────────────────────────────────────────────
  private isTimeToRun(activity: ProactiveActivity): boolean {
    if (!activity.last_run) return true;
    return (Date.now() - new Date(activity.last_run).getTime()) >= parseScheduleToMs(activity.schedule);
  }

  private getTargetServers(activity: ProactiveActivity): ManagedServer[] {
    if (activity.targetType === "all") return this.db.prepare("SELECT * FROM servers").all() as ManagedServer[];
    let ids: string[] = [];
    if (activity.targetType === "server" && activity.targets) {
      try { ids = JSON.parse(activity.targets); } catch { ids = [activity.targets]; }
    }
    if (ids.length === 0) return [];
    const ph = ids.map(() => "?").join(",");
    return this.db.prepare(`SELECT * FROM servers WHERE id IN (${ph})`).all(...ids) as ManagedServer[];
  }

  private getServerMetrics(server: ManagedServer): { cpu: number; memory: number; disk: number } {
    return { cpu: server.cpu || 0, memory: server.memory || 0, disk: server.disk || 0 };
  }

  async wakeUp() { await this.processCycle(); }
}
