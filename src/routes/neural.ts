import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { logAudit } from "../lib/server-helpers.js";
import type { SSHAgent, SSHConnectionConfig } from "../lib/ssh-agent.js";
import { ScriptGenerator } from "../lib/script-generator.js";
import type { OSType, ServerDb, SshConnectionDb } from "../lib/types.js";

export function createNeuralRouter(
  db: Database.Database,
  sshAgent: SSHAgent,
  decrypt: (text: string) => string,
  getLLMResponse: (provider: string, prompt: string) => Promise<string>
): Router {
  const router = Router();

  // POST /api/neural/generate-script
  router.post("/neural/generate-script", async (req: Request, res: Response) => {
    const { prompt, os, context } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const osType: OSType = os === "windows" ? "windows" : "linux";
    const sr = ScriptGenerator.generate({
      category: "generic",
      action: "command",
      os: osType,
      params: { command: prompt },
    });

    try {
      const activeProvider =
        (db.prepare("SELECT provider FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as any)
          ?.provider || process.env.AI_PROVIDER || "gemini";
      const enhancedPrompt = `Generate a ${osType} administrative script for:\n${prompt}\n\nRespond in JSON: { "description": "...", "script": "...", "risks": ["..."] }`;
      const response = await getLLMResponse(activeProvider, enhancedPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const result = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : {
            description: prompt,
            script: sr.script,
            risks: ["AI response was not valid JSON"],
          };
      res.json(result);
    } catch (e: any) {
      console.error("[NEURAL] generate-script error:", e.message?.slice(0, 200));
      res.json({
        description: prompt,
        script: sr.script,
        risks: ["Template script - review before execution"],
        error: e.message?.slice(0, 300),
      });
    }
  });

  // POST /api/neural/generate-skill
  router.post("/neural/generate-skill", async (req: Request, res: Response) => {
    const { contexp, skill_actual } = req.body;
    if (!contexp || !contexp.proposito) {
      return res.status(400).json({ error: "contexp.proposito is required" });
    }

    try {
      const aegisSkill = db
        .prepare("SELECT * FROM skills WHERE id = 'skill-aegis-architect'")
        .get() as any;
      if (!aegisSkill) return res.status(404).json({ error: "Aegis Architect skill not found" });

      const skillDef = fs.readFileSync(aegisSkill.path, "utf8");

      const activeProvider =
        (db.prepare("SELECT provider FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as any)
          ?.provider || process.env.AI_PROVIDER || "gemini";

      const payload = JSON.stringify({ contexp, skill_actual: skill_actual || null });

      const enhancedPrompt = `SKILL DEFINITION (Aegis Architect v2):\n${skillDef}\n\nINPUT_PAYLOAD:\n${payload}\n\nResponde UNICAMENTE con el JSON de salida según el salida_schema definido en la skill.`;

      const response = await getLLMResponse(activeProvider, enhancedPrompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI response did not contain valid JSON");

      const result = JSON.parse(jsonMatch[0]);
      if (!result.nueva_skill || !result.metadata_generacion) {
        throw new Error(
          "AI response missing required fields: nueva_skill and/or metadata_generacion"
        );
      }

      const newSkill = result.nueva_skill;
      const skillId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const skillName = newSkill.nombre || `auto-skill-${Date.now()}`;
      const skillPath = `SKILLS/auto/${skillName.toLowerCase().replace(/[^a-z0-9]/g, "_")}/skill.yaml`;

      const skillDir = path.dirname(path.join(process.cwd(), skillPath));
      if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });

      const yamlContent = `skill:\n  nombre: "${skillName}"\n  descripcion: "${(newSkill.descripcion || "").replace(/"/g, '\\"')}"\n  lenguaje: "auto"\n  prompt_sistema: |\n${(newSkill.prompt_sistema || "").split("\n").map((l: string) => `    ${l}`).join("\n")}\n  entrada_schema:\n    ${JSON.stringify(newSkill.entrada_schema || {}, null, 2).split("\n").join("\n    ")}\n  salida_schema:\n    ${JSON.stringify(newSkill.salida_schema || {}, null, 2).split("\n").join("\n    ")}`;
      fs.writeFileSync(skillPath, yamlContent, "utf8");

      db.prepare(
        "INSERT INTO skills (id, name, language, version, description, path, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)"
      ).run(
        skillId,
        skillName,
        newSkill.lenguaje || "auto",
        result.metadata_generacion.version_skill || "1.0",
        newSkill.descripcion || skillName,
        skillPath,
        new Date().toISOString()
      );

      logAudit(db, "SYSTEM", "SKILL_AUTO_GENERATED", "Aegis genero nueva skill: " + skillName + " (ID: " + skillId + ")", {
        skillId,
        skillName,
        version: result.metadata_generacion.version_skill || "1.0",
        razonamiento: result.metadata_generacion.razonamiento_resumido || "",
      });

      res.json({ success: true, skillId, skill: newSkill, metadata: result.metadata_generacion });
    } catch (error: any) {
      console.error("[AEGIS] Error generating skill:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/neural/execute
  router.post("/neural/execute", async (req: Request, res: Response) => {
    const { prompt, serverId } = req.body;
    if (!prompt || !serverId)
      return res.status(400).json({ error: "prompt and serverId are required" });

    try {
      const server = db.prepare("SELECT * FROM servers WHERE id = ?").get(serverId) as any;
      if (!server) return res.status(404).json({ error: "Server not found" });

      const osType: OSType = server.os === "windows" ? "windows" : "linux";

      const conn = db
        .prepare("SELECT * FROM ssh_connections WHERE serverId = ?")
        .get(serverId) as any;
      if (!conn) return res.status(400).json({ error: "No SSH connection for this server" });

      const key = `${conn.username}@${conn.host}:${conn.port}`;
      try {
        await sshAgent.getSystemMetrics(key);
      } catch {
        const config: SSHConnectionConfig = {
          host: conn.host,
          port: conn.port,
          username: conn.username,
        };
        if (conn.encryptedKey) config.privateKey = decrypt(conn.encryptedKey);
        if (conn.encryptedPassword) config.password = decrypt(conn.encryptedPassword);
        await sshAgent.connect(config);
      }

      const activeProvider =
        (db.prepare("SELECT provider FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as any)
          ?.provider || process.env.AI_PROVIDER || "";

      let plan: any = { command: "", explanation: "", risks: [], confidence: 0 };
      let aiUsed = false;

      if (activeProvider) {
        try {
          const aiPrompt = `You are ARES, an expert ${osType} systems administrator.\n\nSERVER CONTEXT:\n- Name: ${server.name}\n- IP: ${server.ip}\n- OS: ${server.os}\n- Kernel: ${server.kernel || "unknown"}\n- CPU: ${server.cpu || "?"}%\n- Memory: ${server.memory || "?"}%\n- Disk: ${server.disk || "?"}%\n\nUSER REQUEST: ${prompt}\n\nGenerate a single ${osType === "windows" ? "PowerShell" : "bash"} command or script to fulfill this request.\n\nReturn JSON ONLY:\n{\n  "command": "the exact command to execute",\n  "explanation": "what this command does in simple terms",\n  "risks": ["risk1", "risk2"],\n  "confidence": 0.0-1.0\n}`;
          const aiResponse = await getLLMResponse(activeProvider, aiPrompt);
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            plan = JSON.parse(jsonMatch[0]);
            aiUsed = true;
          }
        } catch (aiError) {
          console.log("[NEURAL] AI unavailable, using template fallback");
        }
      }

      if (!plan.command) {
        const lower = prompt.toLowerCase();
        let command = "";

        if (lower.includes("largest file") || lower.includes("disk space") || lower.includes("free space"))
          command = "df -h | head -10";
        else if (lower.includes("memory") || lower.includes("ram") || lower.includes("process"))
          command = "free -h && ps aux --sort=-%mem | head -10";
        else if (lower.includes("cpu") || lower.includes("load"))
          command = "uptime && ps aux --sort=-%cpu | head -10";
        else if (lower.includes("login") || lower.includes("auth"))
          command = "last -10 2>/dev/null || echo 'No login history'";
        else if (lower.includes("service") || lower.includes("daemon"))
          command = "systemctl list-units --type=service --state=running --no-pager | head -20";
        else if (lower.includes("network") || lower.includes("ip") || lower.includes("port"))
          command = "ss -tulpn | head -20";
        else if (lower.includes("docker") || lower.includes("container"))
          command = "docker ps -a 2>/dev/null | head -20 || echo 'Docker not available'";
        else if (lower.includes("log"))
          command = "journalctl -n 30 --no-pager 2>/dev/null || dmesg | tail -30 || echo 'No logs'";
        else if (lower.includes("health") || lower.includes("status") || lower.includes("check"))
          command = "uptime && free -h && df -h /";
        else if (lower.includes("date") || lower.includes("time") || lower.includes("who") || lower.includes("user"))
          command = "date && who && uptime";
        else command = `echo '${prompt.replace(/'/g, "'\\''")}'`;

        plan = {
          command,
          explanation: aiUsed
            ? plan.explanation
            : `Executing based on keyword match: ${prompt} (configure an AI provider in Settings for intelligent command generation)`,
          risks: [
            command.includes("sudo") || command.includes("reboot") || command.includes("shutdown")
              ? "Potentially destructive command - review before executing"
              : "Read-only or diagnostic command",
          ],
          confidence: aiUsed ? plan.confidence || 0.5 : 0.4,
        };
      }

      const execResult = await sshAgent.execCommand(key, plan.command, 15000);

      logAudit(db, "NEURAL", "COMMAND_EXECUTED", `Neural: ${prompt.substring(0, 100)} -> ${plan.command.substring(0, 100)}`, {
        serverId,
        aiUsed,
      });

      res.json({
        success: execResult.code === 0,
        aiUsed,
        prompt,
        command: plan.command,
        explanation: plan.explanation || "",
        risks: plan.risks || [],
        confidence: plan.confidence || 0.1,
        output: execResult.stdout,
        error: execResult.stderr,
        exitCode: execResult.code,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, explanation: "Failed to execute neural command" });
    }
  });

  // POST /api/neural/analyze
  router.post("/neural/analyze", async (req: Request, res: Response) => {
    const { incidentId, provider = "gemini" } = req.body;
    const incident = db
      .prepare("SELECT * FROM incidents WHERE id = ?")
      .get(incidentId) as any;

    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const server = db.prepare("SELECT * FROM servers WHERE id = ?").get(incident.serverId) as any;

    if (!incident || !server) return res.status(404).json({ error: "Not found" });

    try {
      let realTimeMetrics = "";
      const sshConn = db
        .prepare(
          "SELECT * FROM ssh_connections WHERE serverId = ? AND status = 'connected'"
        )
        .get(server.id) as any;
      if (sshConn) {
        try {
          const key = `${sshConn.username}@${sshConn.host}:${sshConn.port}`;
          const metrics = await sshAgent.getSystemMetrics(key);
          realTimeMetrics = `
Real-time SSH Metrics (${sshConn.host}):
- CPU: ${metrics.cpu}%
- Memory: ${metrics.memory}%
- Disk: ${metrics.disk}%
- Uptime: ${Math.floor(metrics.uptime / 3600)}h
- Load Avg: ${metrics.loadAvg.join(", ")}
- Kernel: ${metrics.kernel}
- Processes: ${metrics.processes}
`;
        } catch {}
      }

      const prompt = `
        Context: Saturn Autonomous Infrastructure Management.
        Engine: Ares Neural Engine v1.0
        Memory: ContextP Organizational Knowledge Base
        Incident: ${incident.title} - ${incident.description}
        Server: ${server.name} (${server.os}, ${server.ip})
        ${realTimeMetrics}
        Knowledge Base: ${JSON.stringify(db.prepare("SELECT * FROM contextp_entries").all())}
        
        Execute the OBPA cycle.
        Return JSON with:
        {
          "observation": "detailed analysis",
          "proposal": "suggested fix",
          "remediation_script": "shell script",
          "consolidated_knowledge": "new entry for ContextP",
          "confidence": 0-1
        }
      `;

      const activeProvider =
        provider ||
        (db.prepare("SELECT provider FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as any)
          ?.provider ||
        process.env.AI_PROVIDER ||
        "gemini";
      const text = await getLLMResponse(activeProvider, prompt);
      const jsonStr = text.replace(/```json|```/g, "").trim();
      const aiResponse = JSON.parse(jsonStr);

      const obpaId = `obpa-${Date.now()}`;
      db.prepare(
        `INSERT INTO obpa_cycles (id, incidentId, phase, observation, proposal, remediation_script, execution_result, consolidated_knowledge, confidence, status, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        obpaId,
        incidentId,
        "PROPOSE",
        aiResponse.observation,
        aiResponse.proposal,
        aiResponse.remediation_script,
        "Waiting for Approval",
        aiResponse.consolidated_knowledge,
        aiResponse.confidence,
        "pending",
        new Date().toISOString()
      );

      db.prepare("UPDATE incidents SET status = 'analyzing' WHERE id = ?").run(incidentId);

      logAudit(db, "NEURAL", "ANALYSIS_COMPLETE", `Neural analysis for ${incidentId} complete with ${(aiResponse.confidence * 100).toFixed(1)}% confidence`, {});

      res.json({ success: true, obpaId, analysis: aiResponse });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
