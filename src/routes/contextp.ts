import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import {
  getStatus as getContextPStatus,
  getContractContent,
  getIndexContent,
  getMetricsContent,
  writeAuditLog,
  getAuditLogs,
  getParams,
  getCpiniContent,
} from "../lib/contextp-service.js";

export function createContextpRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/contextp/files
  router.get("/contextp/files", (req: Request, res: Response) => {
    const getFiles = (dir: string): any[] => {
      let results: any[] = [];
      if (!fs.existsSync(dir)) return [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results.push({
            name: file,
            path: filePath,
            type: "dir",
            children: getFiles(filePath),
          });
        } else {
          results.push({
            name: file,
            path: filePath,
            type: "file",
            size: stat.size,
            mtime: stat.mtime,
          });
        }
      });
      return results;
    };
    try {
      const tree = [
        { name: "SKILLS", type: "dir", children: getFiles("SKILLS") },
        { name: "CONTRACTS", type: "dir", children: getFiles("ContextP/CONTRACTS") },
        { name: "PARAMS", type: "dir", children: getFiles("ContextP/PARAMS") },
        { name: "IDENTITY", type: "dir", children: getFiles("ContextP/IDENTITY") },
        { name: "AUDIT", type: "dir", children: getFiles("ContextP/AUDIT") },
      ];
      res.json(tree);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, code: "INTERNAL_ERROR", status: 500 });
    }
  });

  // POST /api/contextp/sync
  router.post("/contextp/sync", (req: Request, res: Response) => {
    try {
      const rootDirs = [
        "ContextP/CONTRACTS",
        "ContextP/PARAMS",
        "ContextP/_INDEX",
        "ContextP/AUDIT/success",
        "ContextP/AUDIT/failure",
      ];
      let synced = 0;
      const insert = db.prepare(
        "INSERT OR REPLACE INTO contextp_entries (path, content, type, lastUpdated) VALUES (?, ?, ?, ?)"
      );

      for (const dir of rootDirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs
          .readdirSync(dir)
          .filter(
            (f) => f !== ".gitkeep" && (f.endsWith(".md") || f.endsWith(".yaml"))
          );
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const content = fs.readFileSync(fullPath, "utf-8");
          insert.run(
            fullPath,
            content,
            dir.includes("AUDIT") ? "audit" : "contract",
            new Date().toISOString()
          );
          synced++;
        }
      }
      res.json({
        success: true,
        synced,
        message: `${synced} entries synced to contextp_entries`,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, code: "INTERNAL_ERROR", status: 500 });
    }
  });

  // GET /api/contextp/read
  router.get("/contextp/read", (req: Request, res: Response) => {
    const filePath = req.query.path as string;
    if (!filePath || filePath.includes(".."))
      return res.status(400).json({ success: false, error: "Invalid path", code: "VALIDATION_ERROR", status: 400 });
    try {
      const content = fs.readFileSync(filePath, "utf8");
      res.json({ content });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, code: "INTERNAL_ERROR", status: 500 });
    }
  });

  // GET /api/contextp/status
  router.get("/contextp/status", (req: Request, res: Response) => {
    const status = getContextPStatus();
    res.json(status);
  });

  // GET /api/contextp/cpini
  router.get("/contextp/cpini", (req: Request, res: Response) => {
    const content = getCpiniContent();
    res.json({ content, exists: !!content });
  });

  // GET /api/contextp/contracts
  router.get("/contextp/contracts", (req: Request, res: Response) => {
    const contracts = [
      "ROOT_CONTRACT",
      "TECH_CONTRACT",
      "FUNC_CONTRACT",
      "STRUCT_CONTRACT",
      "AUDIT_CONTRACT",
    ];
    const result = contracts.map((name) => ({
      name,
      content: getContractContent(name),
      exists: !!getContractContent(name),
    }));
    res.json(result);
  });

  // GET /api/contextp/contract/:name
  router.get("/contextp/contract/:name", (req: Request, res: Response) => {
    const { name } = req.params;
    const content = getContractContent(name.toUpperCase().replace(/-/g, "_"));
    if (!content) return res.status(404).json({ success: false, error: "Contract not found", code: "NOT_FOUND", status: 404 });
    res.json({ name, content });
  });

  // GET /api/contextp/index
  router.get("/contextp/index", (req: Request, res: Response) => {
    const content = getIndexContent();
    res.json({ content, exists: !!content });
  });

  // GET /api/contextp/metrics
  router.get("/contextp/metrics", (req: Request, res: Response) => {
    const content = getMetricsContent();
    res.json({ content, exists: !!content });
  });

  // GET /api/contextp/audit
  router.get("/contextp/audit", (req: Request, res: Response) => {
    const logs = getAuditLogs();
    res.json(logs);
  });

  // POST /api/contextp/audit
  router.post("/contextp/audit", (req: Request, res: Response) => {
    const { id, date, type, domain, title, detail } = req.body;
    if (!id || !type || !domain || !title) {
      return res.status(400).json({ success: false, error: "id, type, domain, and title are required", code: "VALIDATION_ERROR", status: 400 });
    }
    const success = writeAuditLog({
      id,
      date: date || new Date().toISOString().split("T")[0],
      type,
      domain,
      title,
      detail: detail || "",
    });
    res.json({ success });
  });

  // GET /api/contextp/params
  router.get("/contextp/params", (req: Request, res: Response) => {
    const params = getParams();
    res.json(params);
  });

  // GET /api/contextp/patterns
  router.get("/contextp/patterns", (req: Request, res: Response) => {
    const status = getContextPStatus();
    res.json(status.patterns);
  });

  // GET /api/contextp/debt
  router.get("/contextp/debt", (req: Request, res: Response) => {
    const status = getContextPStatus();
    res.json(status.technicalDebt);
  });

  return router;
}
