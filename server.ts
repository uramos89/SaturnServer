import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { GoogleGenerativeAI } from "@google/genai";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
const db = new Database("saturno.db");
db.pragma("journal_mode = WAL");

// Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT,
    ip TEXT,
    os TEXT,
    status TEXT,
    cpu REAL,
    memory REAL,
    lastCheck TEXT,
    tags TEXT
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    serverId TEXT,
    severity TEXT,
    title TEXT,
    description TEXT,
    status TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS obpa_cycles (
    id TEXT PRIMARY KEY,
    incidentId TEXT,
    phase TEXT,
    observation TEXT,
    proposal TEXT,
    remediation_script TEXT,
    execution_result TEXT,
    consolidated_knowledge TEXT,
    confidence REAL,
    status TEXT DEFAULT 'pending',
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS contextp_entries (
    path TEXT PRIMARY KEY,
    content TEXT,
    type TEXT,
    lastUpdated TEXT
  );

  CREATE TABLE IF NOT EXISTS notification_configs (
    id TEXT PRIMARY KEY,
    type TEXT, -- 'email', 'slack', 'webhook'
    destination TEXT,
    config TEXT, -- JSON blob for SMTP settings or Slack token
    enabled INTEGER
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    type TEXT, -- 'SYSTEM', 'NEURAL', 'USER'
    event TEXT,
    detail TEXT,
    timestamp TEXT
  );
`);

// Notification Service
async function sendNotification(type: string, title: string, message: string, severity: string) {
  const configs = db.prepare("SELECT * FROM notification_configs WHERE enabled = 1").all() as any[];
  
  for (const config of configs) {
    try {
      if (config.type === 'webhook' || config.type === 'slack') {
        const axios = (await import("axios")).default;
        await axios.post(config.destination, {
          text: `*[SATURNO - ${severity.toUpperCase()}]* ${title}\n${message}`,
          title,
          message,
          severity,
          timestamp: new Date().toISOString()
        });
      } else if (config.type === 'email') {
        const nodemailer = (await import("nodemailer")).default;
        const smtpConfig = JSON.parse(config.config);
        const transporter = nodemailer.createTransport(smtpConfig);
        await transporter.sendMail({
          from: `"Saturno Core" <${smtpConfig.auth.user}>`,
          to: config.destination,
          subject: `[SATURNO] ${severity.toUpperCase()}: ${title}`,
          text: message
        });
      }
    } catch (error) {
      console.error(`Failed to send notification to ${config.destination}:`, error);
    }
  }
}

// LLM Adapter Logic
async function getLLMResponse(provider: string, prompt: string) {
  if (provider === 'gemini') {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return (await result.response).text();
  } else if (provider === 'openai') {
    const axios = (await import("axios")).default;
    const response = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    return response.data.choices[0].message.content;
  } else if (provider === 'ollama') {
    const axios = (await import("axios")).default;
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3",
      prompt: prompt,
      stream: false
    });
    return response.data.response;
  }
  throw new Error(`Provider ${provider} not supported`);
}

// Seed Data (if empty)
const serverCount = db.prepare("SELECT COUNT(*) as count FROM servers").get() as { count: number };
if (serverCount.count === 0) {
  const insertServer = db.prepare("INSERT INTO servers (id, name, ip, os, status, cpu, memory, lastCheck, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insertServer.run("srv-001", "Nexus-Core-01", "10.0.0.1", "linux", "online", 12.5, 45.2, new Date().toISOString(), "prod,core");
  insertServer.run("srv-002", "Titan-Win-DB", "10.0.0.2", "windows", "degraded", 88.1, 92.4, new Date().toISOString(), "prod,db");
  insertServer.run("srv-003", "Edge-Unix-01", "10.0.0.3", "unix", "online", 5.2, 12.8, new Date().toISOString(), "edge");
  
  // Initial ContextP Knowledge
  const insertContext = db.prepare("INSERT INTO contextp_entries (path, content, type, lastUpdated) VALUES (?, ?, ?, ?)");
  insertContext.run("TECH/linux/baseline.md", "# Linux Security Baseline\n- Port 22 limited to internal\n- Autoupdate enabled", "TECH", new Date().toISOString());
  insertContext.run("CONTRACTS/root_contract.md", "# Root Contract\nEvery action must be audited. No direct root login.", "CONTRACTS", new Date().toISOString());
  insertContext.run("PARAMS/preferences.md", "# User Preferences\n- Language: Spanish\n- AI Provider: Gemini 2.0\n- Strict Mode: Enabled", "PARAMS", new Date().toISOString());
  insertContext.run("_INDEX/INDEX_MASTER.md", "# Index Master\n- TECH: General documentation\n- STRUCT: Architecture templates\n- AUDIT: Execution history", "INDEX", new Date().toISOString());
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/servers", (req, res) => {
    const servers = db.prepare("SELECT * FROM servers").all();
    res.json(servers.map((s: any) => ({ ...s, tags: s.tags.split(",") })));
  });

  app.get("/api/incidents", (req, res) => {
    const incidents = db.prepare("SELECT * FROM incidents ORDER BY timestamp DESC").all();
    res.json(incidents);
  });

  app.get("/api/contextp", (req, res) => {
    const entries = db.prepare("SELECT * FROM contextp_entries").all();
    res.json(entries);
  });

  app.get("/api/notifications", (req, res) => {
    const configs = db.prepare("SELECT * FROM notification_configs").all();
    res.json(configs);
  });

  app.post("/api/notifications/config", (req, res) => {
    const { type, destination, config, enabled } = req.body;
    const id = `notif-${Date.now()}`;
    db.prepare("INSERT OR REPLACE INTO notification_configs (id, type, destination, config, enabled) VALUES (?, ?, ?, ?, ?)")
      .run(id, type, destination, JSON.stringify(config), enabled ? 1 : 0);
    res.json({ id, success: true });
  });

  app.get("/api/audit", (req, res) => {
    const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").all();
    res.json(logs);
  });

  app.get("/api/obpa/pending", (req, res) => {
    const pending = db.prepare("SELECT * FROM obpa_cycles WHERE status = 'pending'").all();
    res.json(pending);
  });

  app.post("/api/obpa/approve", async (req, res) => {
    const { obpaId, approved } = req.body;
    const cycle = db.prepare("SELECT * FROM obpa_cycles WHERE id = ?").get() as any;
    if (!cycle) return res.status(404).json({ error: "Cycle not found" });

    if (approved) {
      db.prepare("UPDATE obpa_cycles SET status = 'approved' WHERE id = ?").run(obpaId);
      // Log execution
      db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "USER", "REMEDIATION_APPROVED", `User approved remediation for incident ${cycle.incidentId}`, new Date().toISOString());
      
      // Update incident status to closed after "execution"
      db.prepare("UPDATE incidents SET status = 'closed' WHERE id = ?").run(cycle.incidentId);
      
      await sendNotification("success", "Remediación Exitosa", `Se ha aplicado la remediación para el incidente ${cycle.incidentId} tras aprobación manual.`, "success");
    } else {
      db.prepare("UPDATE obpa_cycles SET status = 'rejected' WHERE id = ?").run(obpaId);
      db.prepare("UPDATE incidents SET status = 'open' WHERE id = ?").run(cycle.incidentId);
    }
    res.json({ success: true });
  });

  app.post("/api/incidents/create", async (req, res) => {
    const { serverId, title, description, severity } = req.body;
    const id = `inc-${Date.now()}`;
    const timestamp = new Date().toISOString();
    db.prepare("INSERT INTO incidents (id, serverId, title, description, severity, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, serverId, title, description, severity, "open", timestamp);
    
    db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "SYSTEM", "INCIDENT_CREATED", `Incident ${id} on ${serverId}: ${title}`, timestamp);

    await sendNotification("warning", `Nuevo Incidente: ${title}`, description, severity);
    
    res.json({ id, status: "open" });
  });

  // Neural Core: OBPA Cycle Simulation
  app.post("/api/neural/analyze", async (req, res) => {
    const { incidentId, provider = 'gemini' } = req.body;
    const incident = db.prepare("SELECT * FROM incidents WHERE id = ?").get() as any;
    const server = db.prepare("SELECT * FROM servers WHERE id = ?").get() as any;
    
    if (!incident || !server) return res.status(404).json({ error: "Not found" });

    try {
      // Phase: OBSERVE & PROPOSE 
      const prompt = `
        Context: Saturno IA Infrastructure Management.
        Incident: ${incident.title} - ${incident.description}
        Server: ${server.name} (${server.os}, ${server.ip})
        Knowledge Base: ${JSON.stringify(db.prepare("SELECT * FROM contextp_entries").all())}
        
        Execute the OBPA (Observe, Propose, Execute, Bitácora, Consolidate) cycle.
        Return a JSON with:
        {
          "observation": "detailed analysis of what happened",
          "proposal": "suggested fix",
          "remediation_script": "shell script or powershell",
          "consolidated_knowledge": "new entry for ContextP",
          "confidence": 0-1
        }
      `;

      const text = await getLLMResponse(provider, prompt);
      // Clean markdown if present
      const jsonStr = text.replace(/```json|```/g, "").trim();
      const aiResponse = JSON.parse(jsonStr);

      const obpaId = `obpa-${Date.now()}`;
      db.prepare(`
        INSERT INTO obpa_cycles (id, incidentId, phase, observation, proposal, remediation_script, execution_result, consolidated_knowledge, confidence, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
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

      // Update incident status
      db.prepare("UPDATE incidents SET status = 'analyzing' WHERE id = ?").run(incidentId);
      
      // Log analysis
      db.prepare("INSERT INTO audit_logs (id, type, event, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(`audit-${Date.now()}`, "NEURAL", "ANALYSIS_COMPLETE", `Neural analysis for ${incidentId} complete with ${(aiResponse.confidence * 100).toFixed(1)}% confidence`, new Date().toISOString());

      res.json({ success: true, obpaId, analysis: aiResponse });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Saturno Core running on http://localhost:${PORT}`);
  });
}

startServer();
