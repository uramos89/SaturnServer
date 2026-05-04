import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { logAudit } from "../lib/server-helpers.js";
import { decryptCredential } from "../services/credential-service.js";

const VAULT_BASE = "IDENTITY/credentials_vault";

export function createCloudRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/credentials
  router.get("/credentials", (req: Request, res: Response) => {
    const creds = db.prepare("SELECT * FROM cloud_credentials ORDER BY created_at DESC").all();
    res.json(creds);
  });

  // POST /api/credentials/import
  router.post("/credentials/import", async (req: Request, res: Response) => {
    const { name, provider, type, content, metadata } = req.body;
    if (!name || !provider || !content)
      return res.status(400).json({ success: false, error: "Missing fields", code: "VALIDATION_ERROR", status: 400 });

    const id = crypto.randomUUID();
    const vaultPath = path.join(VAULT_BASE, provider, `${id}.age`);

    const key = crypto.scryptSync(
      process.env.SATURN_MASTER_KEY || "saturn-default-secret",
      "salt",
      32
    );
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(content, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    const finalData = Buffer.concat([iv, tag, encrypted]);
    fs.writeFileSync(vaultPath, finalData);

    db.prepare(
      `INSERT INTO cloud_credentials (id, name, provider, type, encrypted_path, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name, provider, type, vaultPath, JSON.stringify(metadata || {}));

    logAudit(db, "SYSTEM", "CREDENTIAL_IMPORT", `Imported ${provider} credential: ${name}`, {});
    res.json({ success: true, id });
  });

  // DELETE /api/credentials/:id
  router.delete("/credentials/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const cred = db.prepare("SELECT * FROM cloud_credentials WHERE id = ?").get(id) as any;
    if (cred) {
      if (fs.existsSync(cred.encrypted_path)) fs.unlinkSync(cred.encrypted_path);
      db.prepare("DELETE FROM cloud_credentials WHERE id = ?").run(id);
      logAudit(db, "SYSTEM", "CREDENTIAL_REVOKE", `Revoked credential: ${cred.name}`, {});
    }
    res.json({ success: true });
  });

  // POST /api/cloud/scan
  router.post("/cloud/scan", async (req: Request, res: Response) => {
    const { credId } = req.body;
    const cred = db.prepare("SELECT * FROM cloud_credentials WHERE id = ?").get(credId) as any;
    if (!cred) return res.status(404).json({ success: false, error: "Credential not found", code: "CRED_NOT_FOUND", status: 404 });

    let credentials;
    try {
      credentials = decryptCredential(cred.encrypted_path);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: "Vault decryption failed:  ${error.message}` });
    }

    let discovered: any[] = [];

    try {
      switch (cred.provider) {
        case "aws": {
          const { EC2Client, DescribeInstancesCommand } = await import("@aws-sdk/client-ec2");
          const client = new EC2Client({
            region: credentials.region || "us-east-1",
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
            },
          });

          const result = await client.send(new DescribeInstancesCommand({}));
          discovered = result.Reservations!.flatMap((r) =>
            r.Instances!.map((i) => ({
              id: `ec2-${i.InstanceId}`,
              name: i.Tags?.find((t) => t.Key === "Name")?.Value || i.InstanceId,
              ip: i.PublicIpAddress || i.PrivateIpAddress || "0.0.0.0",
              os: i.PlatformDetails?.toLowerCase().includes("windows") ? "windows" : "linux",
              provider: "aws",
              region: credentials.region,
              instanceId: i.InstanceId,
              instanceType: i.InstanceType,
              state: i.State?.Name,
              launchTime: i.LaunchTime?.toISOString(),
            }))
          );
          break;
        }
        case "gcp": {
          const { InstancesClient } = await import("@google-cloud/compute");
          const client = new InstancesClient({
            credentials: {
              client_email: credentials.clientEmail,
              private_key: credentials.privateKey,
            },
            projectId: credentials.projectId,
          });

          const [instances] = await client.list({ project: credentials.projectId, zone: "-" });
          discovered = instances.map((i) => ({
            id: `gcp-${i.id}`,
            name: i.name,
            ip:
              i.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP ||
              i.networkInterfaces?.[0]?.networkIP ||
              "0.0.0.0",
            os: i.disks?.[0]?.licenses?.[0]?.includes("windows") ? "windows" : "linux",
            provider: "gcp",
            zone: i.zone?.split("/").pop(),
            machineType: i.machineType?.split("/").pop(),
            status: i.status?.toLowerCase(),
          }));
          break;
        }
        case "azure": {
          const { ComputeManagementClient } = await import("@azure/arm-compute");
          const { ClientSecretCredential } = await import("@azure/identity");

          const azureCred = new ClientSecretCredential(
            credentials.tenantId,
            credentials.clientId,
            credentials.clientSecret
          );

          const client = new ComputeManagementClient(azureCred, credentials.subscriptionId);
          const vms = [];
          for await (const vm of client.virtualMachines.listAll()) {
            vms.push({
              id: `azure-${vm.vmId}`,
              name: vm.name,
              ip: "0.0.0.0",
              os: vm.storageProfile?.osDisk?.osType?.toLowerCase() || "linux",
              provider: "azure",
              location: vm.location,
              vmSize: vm.hardwareProfile?.vmSize,
              status: vm.instanceView?.statuses?.[1]?.displayStatus,
            });
          }
          discovered = vms;
          break;
        }
        default:
          return res.status(400).json({ success: false, error: "Unsupported provider:  ${cred.provider}` });
      }

      const insertServer = db.prepare(
        `INSERT OR IGNORE INTO servers 
         (id, name, ip, os, status, tags) VALUES (?, ?, ?, ?, 'pending', ?)`
      );

      for (const s of discovered) {
        insertServer.run(s.id, s.name, s.ip, s.os, `${s.provider},${s.region || s.location || s.zone || ""}`);
      }

      logAudit(db, "SYSTEM", "CLOUD_SCAN", `Scanned ${cred.provider} account - discovered ${discovered.length} instances`, {});

      res.json({ success: true, discovered: discovered.length, instances: discovered });
    } catch (error: any) {
      logAudit(db, "SYSTEM", "CLOUD_SCAN_ERROR", `Error scanning ${cred.provider}: ${error.message}`, {});
      res.status(500).json({ success: false, error: error.message, code: "INTERNAL_ERROR", status: 500 });
    }
  });

  // POST /api/cloud/ssm-exec
  router.post("/cloud/ssm-exec", async (req: Request, res: Response) => {
    const { credId, instanceId, command } = req.body;
    if (!credId || !instanceId || !command) {
      return res.status(400).json({ success: false, error: "credId, instanceId, and command are required", code: "VALIDATION_ERROR", status: 400 });
    }

    const cred = db.prepare("SELECT * FROM cloud_credentials WHERE id = ?").get(credId) as any;
    if (!cred) return res.status(404).json({ success: false, error: "Credential not found", code: "CRED_NOT_FOUND", status: 404 });

    try {
      const credentials = decryptCredential(cred.encrypted_path);

      const { ssmExecCommand } = await import("../services/ssm-service.js");
      const result = await ssmExecCommand(
        {
          region: credentials.region || "us-east-1",
          accessKeyId: credentials.accessKeyId || credentials.accessKey,
          secretAccessKey: credentials.secretAccessKey || credentials.secretKey,
        },
        instanceId,
        command
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message, code: "INTERNAL_ERROR", status: 500 });
    }
  });

  // POST /api/cloud/ssm-instances
  router.post("/cloud/ssm-instances", async (req: Request, res: Response) => {
    const { credId } = req.body;
    if (!credId) return res.status(400).json({ success: false, error: "credId is required", code: "VALIDATION_ERROR", status: 400 });

    const cred = db.prepare("SELECT * FROM cloud_credentials WHERE id = ?").get(credId) as any;
    if (!cred) return res.status(404).json({ success: false, error: "Credential not found", code: "CRED_NOT_FOUND", status: 404 });

    try {
      const credentials = decryptCredential(cred.encrypted_path);

      const { ssmListInstances } = await import("../services/ssm-service.js");
      const instances = await ssmListInstances({
        region: credentials.region || "us-east-1",
        accessKeyId: credentials.accessKeyId || credentials.accessKey,
        secretAccessKey: credentials.secretAccessKey || credentials.secretKey,
      });

      res.json({ success: true, instances });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message, code: "INTERNAL_ERROR", status: 500 });
    }
  });

  return router;
}
