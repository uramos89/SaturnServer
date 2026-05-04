import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { logAudit } from "../lib/server-helpers.js";
import { ScriptValidator } from "../lib/script-validator.js";
import type { SSHAgent, SSHConnectionConfig } from "../lib/ssh-agent.js";
import type { OSType } from "../lib/types.js";

// ── Helper: extract JSON from string with noise ─────────────────────────
function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e: any) {
        throw new Error(`Failed to parse extracted JSON: ${e.message}`);
      }
    }
    throw new Error("No JSON block found in output");
  }
}

export function createSkillsRouter(
  db: Database.Database,
  sshAgent: SSHAgent,
  decrypt: (text: string) => string,
  getLLMResponse: (provider: string, prompt: string) => Promise<string>,
  sendNotification: (type: string, title: string, message: string, severity: string) => Promise<void>
): Router {
  const router = Router();

  // GET /api/skills
  router.get("/skills", (req: Request, res: Response) => {
    const skills = db.prepare("SELECT * FROM skills WHERE enabled = 1").all();
    res.json(skills);
  });

  // POST /api/skills/import
  router.post("/skills/import", (req: Request, res: Response) => {
    const { name, language, version, description, script } = req.body;
    const id = `skill_${Date.now()}`;
    try {
      db.prepare(
        "INSERT INTO skills (id, name, language, version, description, path, script) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(id, name, language, version, description, "custom", script || "");
      res.json({ success: true, id });
    } catch (e: any) {
      if (e.message.includes("no such column: script")) {
        db.prepare(
          "INSERT INTO skills (id, name, language, version, description, path) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(id, name, language, version, description, "custom");
        res.json({ success: true, id, warning: "Saved without script body" });
      } else {
        res.status(500).json({ success: false, error: e.message, code: "IMPORT_ERROR", status: 500 });
      }
    }
  });

  // ── Seed default skills if empty ────────────────────────────────────
  const existingSkills = db.prepare("SELECT COUNT(*) as c FROM skills").get() as any;
  if (existingSkills.c === 0) {
    const insert = db.prepare(
      "INSERT INTO skills (id, name, language, version, description, path) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const defaultSkills = [
      ["ps_remediation_v1", "PowerShell Remediation Expert", "powershell", "1.0", "Expert in Windows Server remediation", "SKILLS/powershell_remediation_v1/skill.yaml"],
      ["bash_remediation_v1", "Bash Linux Remediation", "bash", "1.0", "Expert in Linux system recovery", "SKILLS/bash_remediation_v1/skill.yaml"],
      ["windows_firewall_manager", "Windows Firewall Manager", "powershell", "1.0", "Manage Windows Firewall rules via netsh and PowerShell. List, add, remove inbound/outbound rules.", "SKILLS/windows_firewall_manager/skill.yaml"],
      ["windows_task_scheduler", "Windows Task Scheduler", "powershell", "1.0", "Manage scheduled tasks on Windows. List, create, enable, disable, delete tasks.", "SKILLS/windows_task_scheduler/skill.yaml"],
      ["windows_service_manager", "Windows Service Manager", "powershell", "1.0", "Manage Windows services — list, start, stop, restart, enable, disable, and query service status.", "SKILLS/windows_service_manager/skill.yaml"],
      ["windows_event_log_reader", "Windows Event Log Reader", "powershell", "1.0", "Read and query Windows Event Logs — system, application, security, and custom logs with filters.", "SKILLS/windows_event_log_reader/skill.yaml"],
    ];
    for (const s of defaultSkills) {
      try {
        insert.run(...s);
      } catch (e: any) {
        console.warn(`[SEED] Could not seed skill ${s[0]}: ${e.message}`);
      }
    }
  }

  // ── Remediation Modes ───────────────────────────────────────────────
  router.get("/remediation/config", (req: Request, res: Response) => {
    const configs = db.prepare("SELECT * FROM remediation_configs").all();
    res.json(configs);
  });

  router.post("/remediation/config", (req: Request, res: Response) => {
    const { serverId, mode, skillId, threshold } = req.body;
    db.prepare(
      `INSERT OR REPLACE INTO remediation_configs (serverId, mode, skillId, confidence_threshold, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(serverId || "global", mode, skillId || null, threshold || 0.7);
    res.json({ success: true });
  });

  // Seed global config
  const globalCheck = db
    .prepare("SELECT COUNT(*) as c FROM remediation_configs WHERE serverId = 'global'")
    .get() as any;
  if (globalCheck.c === 0) {
    db.prepare(
      "INSERT INTO remediation_configs (serverId, mode, confidence_threshold) VALUES ('global', 'auto', 0.7)"
    ).run();
  }

  // POST /api/skills/generate
  router.post("/skills/generate", async (req: Request, res: Response) => {
    const { skillId, prompt, serverId, forceManual = false } = req.body;

    const globalConfig = db
      .prepare("SELECT * FROM remediation_configs WHERE serverId = 'global'")
      .get() as any;
    const serverConfig = db
      .prepare("SELECT * FROM remediation_configs WHERE serverId = ?")
      .get(serverId) as any;
    const activeConfig = serverConfig || globalConfig;

    let targetSkillId = skillId;
    if (!targetSkillId) {
      targetSkillId = activeConfig.mode === "skill" ? activeConfig.skillId : "ps_remediation_v1";
    }

    const skill = db.prepare("SELECT * FROM skills WHERE id = ?").get(targetSkillId) as any;
    if (!skill) return res.status(404).json({ success: false, error: "Skill not found", code: "NOT_FOUND", status: 404 });

    const server = db.prepare("SELECT * FROM servers WHERE id = ?").get(serverId) as any;
    const skillDef = fs.readFileSync(skill.path, "utf8");

    const enhancedPrompt = `
      INSTRUCCIÓN: ${prompt}
      SKILL: ${skillDef}
      SERVER: ${JSON.stringify(server)}
      
      REGLAS AUTÓNOMAS:
      1. Genera el script completo.
      2. Calcula un nivel de confianza (0.0 a 1.0) basado en la precisión del remedio.
      3. Identifica si el script contiene comandos peligrosos (peligro: true/false).
      4. Formato de respuesta JSON: { "script": "...", "confidence": 0.95, "dangerous": false, "explanation": "..." }
    `;

    try {
      let result: any = {};
      let attempts = 0;
      const maxAttempts = 3;
      let currentPrompt = enhancedPrompt;

      while (attempts < maxAttempts) {
        attempts++;
        const activeProvider = (
          db.prepare("SELECT provider FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as any
        )?.provider || process.env.AI_PROVIDER || "gemini";
        const response = await getLLMResponse(activeProvider, currentPrompt);
        result = JSON.parse(response.replace(/```json/g, "").replace(/```/g, ""));

        const validation = ScriptValidator.validate(result.script, skill.language);
        if (validation.success) {
          result.validation = { status: "passed", errors: [] };
          break;
        } else {
          result.validation = { status: "failed", errors: validation.errors };
          if (attempts < maxAttempts) {
            currentPrompt = `
              EL SCRIPT ANTERIOR TIENE ERRORES DE VALIDACIÓN. POR FAVOR CORRÍGELO.
              ERRORES:
              ${validation.errors.join("\n")}
              
              SCRIPT ORIGINAL:
              ${result.script}
              
              RESPONDE SOLO CON EL JSON CORREGIDO.
            `;
          }
        }
      }

      let status = "pending_approval";
      const threshold = activeConfig.confidence_threshold || 0.7;
      if (
        !forceManual &&
        activeConfig.mode !== "manual" &&
        result.confidence >= threshold &&
        !result.dangerous &&
        result.validation?.status === "passed"
      ) {
        status = "executing_autonomously";
        logAudit(db, "SYSTEM", "AUTO_REMEDIATION", `Executing autonomous fix for ${serverId} using ${skill.name}`, {
          confidence: result.confidence,
          validation: result.validation,
        });
        sendNotification(
          "info",
          `🤖 Auto-remediation: ${skill.name}`,
          `ARES ejecutó ${skill.name} en servidor ${serverId} con ${Math.round(result.confidence * 100)}% confianza.`,
          "info"
        ).catch((e: any) => console.error("[NOTIFY] Auto-remediation notification failed:", e.message));
      }

      res.json({ success: true, ...result, status, skill: skill.name });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message, code: "GENERATE_ERROR", status: 500 });
    }
  });

  // ── Skill Assignments ───────────────────────────────────────────────
  router.get("/skills/assignments", (req: Request, res: Response) => {
    const assignments = db.prepare("SELECT * FROM skill_assignments").all();
    res.json(assignments);
  });

  router.post("/skills/assignments", (req: Request, res: Response) => {
    const { skillId, targetId, targetType, isPreferred } = req.body;
    db.prepare(
      `INSERT OR REPLACE INTO skill_assignments (id, skillId, targetId, targetType, isPreferred)
       VALUES (?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), skillId, targetId, targetType || "server", isPreferred ? 1 : 0);
    res.json({ success: true });
  });

  return router;
}
