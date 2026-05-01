import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXTP_ROOT = path.resolve(process.cwd(), "ContextP");

// ── ContextP Service ────────────────────────────────────────────────────────
// Implements the OBPA cycle (Observe, Propose, Execute, Bitácora, Consolidate)
// and provides endpoints for ContextP commands.

export interface ContextPStatus {
  structureExists: boolean;
  phase: "bootstrap" | "active" | "maintenance";
  ingestStatus: "not-run" | "complete" | "partial";
  lastUpdated: string;
  contracts: { name: string; file: string; priority: number }[];
  patterns: { id: string; name: string; confidence: number }[];
  features: { id: string; name: string; progress: string }[];
  technicalDebt: { id: string; item: string; priority: string }[];
  metrics: { patternSuccessRate: string; avgConfidence: string };
}

export interface AuditLogEntry {
  id: string;
  date: string;
  type: "success" | "failure" | "exploration" | "ingest";
  domain: "TECH" | "FUNC" | "STRUCT" | "AUDIT" | "INGEST";
  title: string;
  detail: string;
}

// ── Read ContextP files ─────────────────────────────────────────────────────

function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function getIndexMaster(): any {
  const content = readFileSafe(path.join(CONTEXTP_ROOT, "_INDEX", "INDEX_MASTER.md"));
  return { content, exists: !!content };
}

function getContracts(): { name: string; file: string; priority: number }[] {
  const contractsDir = path.join(CONTEXTP_ROOT, "CONTRACTS");
  const files = [
    { name: "ROOT_CONTRACT", file: "ROOT_CONTRACT.md", priority: 1 },
    { name: "TECH_CONTRACT", file: "TECH_CONTRACT.md", priority: 2 },
    { name: "FUNC_CONTRACT", file: "FUNC_CONTRACT.md", priority: 3 },
    { name: "STRUCT_CONTRACT", file: "STRUCT_CONTRACT.md", priority: 4 },
    { name: "AUDIT_CONTRACT", file: "AUDIT_CONTRACT.md", priority: 5 },
  ];
  return files.map(f => ({
    ...f,
    exists: fs.existsSync(path.join(contractsDir, f.file))
  }));
}

function getMetrics(): any {
  const content = readFileSafe(path.join(CONTEXTP_ROOT, "AUDIT", "metrics", "METRICS_MASTER.md"));
  return { content, exists: !!content };
}

// ── Public API ──────────────────────────────────────────────────────────────

export function getStatus(): ContextPStatus {
  const indexExists = fs.existsSync(path.join(CONTEXTP_ROOT, "_INDEX", "INDEX_MASTER.md"));
  const contracts = getContracts();
  const allContractsExist = contracts.every((c: any) => c.exists);

  return {
    structureExists: fs.existsSync(CONTEXTP_ROOT),
    phase: allContractsExist ? "active" : "bootstrap",
    ingestStatus: indexExists ? "partial" : "not-run",
    lastUpdated: new Date().toISOString(),
    contracts: contracts.map(c => ({ name: c.name, file: c.file, priority: c.priority })),
    patterns: [
      { id: "P-01", name: "Repository", confidence: 90 },
      { id: "P-02", name: "Observer", confidence: 85 },
      { id: "P-03", name: "Strategy", confidence: 80 },
      { id: "P-04", name: "State Machine", confidence: 85 },
      { id: "P-05", name: "Publisher-Subscriber", confidence: 80 },
      { id: "P-06", name: "Middleware Chain", confidence: 90 },
      { id: "P-07", name: "File System Store", confidence: 75 },
    ],
    features: [
      { id: "F-07", name: "ContextP Integration", progress: "80%" },
    ],
    technicalDebt: [
      { id: "TD-01", item: "Chunk size > 500KB in frontend build", priority: "Medium" },
      { id: "TD-02", item: "No test suite configured", priority: "High" },
    ],
    metrics: {
      patternSuccessRate: "85%",
      avgConfidence: "83.6%"
    }
  };
}

export function getContractContent(contractName: string): string {
  const filePath = path.join(CONTEXTP_ROOT, "CONTRACTS", `${contractName}.md`);
  return readFileSafe(filePath);
}

export function getIndexContent(): string {
  return readFileSafe(path.join(CONTEXTP_ROOT, "_INDEX", "INDEX_MASTER.md"));
}

export function getMetricsContent(): string {
  return readFileSafe(path.join(CONTEXTP_ROOT, "AUDIT", "metrics", "METRICS_MASTER.md"));
}

export function writeAuditLog(entry: AuditLogEntry): boolean {
  try {
    const logPath = path.join(CONTEXTP_ROOT, "AUDIT", entry.type === "success" ? "success" : entry.type === "failure" ? "failure" : "exploration_log");
    const fileName = `${entry.domain}-${entry.id}-${entry.date.replace(/-/g, "")}.md`;
    const content = `## ${entry.domain}-${entry.id}-${entry.date.replace(/-/g, "")} | ${entry.title}

**Date:** ${entry.date}
**Type:** ${entry.type}
**Domain:** ${entry.domain}

### Detail
${entry.detail}
`;
    fs.writeFileSync(path.join(logPath, fileName), content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function getAuditLogs(): { file: string; content: string }[] {
  const dirs = ["success", "failure", "exploration_log"];
  const logs: { file: string; content: string }[] = [];
  for (const dir of dirs) {
    const dirPath = path.join(CONTEXTP_ROOT, "AUDIT", dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".md") && f !== ".gitkeep");
      for (const file of files.slice(-10)) {
        logs.push({ file, content: readFileSafe(path.join(dirPath, file)) });
      }
    }
  }
  return logs;
}

export function getParams(): { preferences: string; config: string; constraints: string } {
  return {
    preferences: readFileSafe(path.join(CONTEXTP_ROOT, "PARAMS", "user_preferences.md")),
    config: readFileSafe(path.join(CONTEXTP_ROOT, "PARAMS", "project_config.md")),
    constraints: readFileSafe(path.join(CONTEXTP_ROOT, "PARAMS", "constraints.md")),
  };
}

export function getCpiniContent(): string {
  return readFileSafe(path.join(CONTEXTP_ROOT, "cpini.md"));
}
