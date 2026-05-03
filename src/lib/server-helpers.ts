import crypto from "crypto";
import type Database from "better-sqlite3";

// ── JWT Secret ─────────────────────────────────────────────────────────
export const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

// ── Encryption helpers (from crypto-utils — local instance uses server's
//    SSH_ENCRYPTION_PEPPER for credential storage in route handlers) ─────

/**
 * logAudit writes a structured audit entry with compliance metadata.
 * The metadata object is enriched with _compliance (GDPR/PCI/HIPAA) before INSERT.
 */
export function logAudit(
  db: Database.Database,
  type: string,
  event: string,
  detail: string,
  metadata: Record<string, any> = {}
): void {
  const id = `audit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const enriched = {
    ...metadata,
    _compliance: {
      eventId: id,
      timestamp: new Date().toISOString(),
      gdpr: {
        dataCategory: metadata.gdprCategory || "system",
        legalBasis: metadata.gdprBasis || "legitimate_interest",
      },
      pci: {
        scope: metadata.pciScope || "out_of_scope",
        requirement: metadata.pciReq || "10.2",
      },
      hipaa: {
        ePHI: metadata.ephi || false,
        safeguard: metadata.safeguard || "administrative",
      },
    },
  };
  db.prepare(
    "INSERT INTO audit_logs (id, type, event, detail, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, type, event, detail, JSON.stringify(enriched), new Date().toISOString());
}

/**
 * encryptCredential encrypts a plaintext credential for DB storage.
 */
export function encryptCredential(text: string): string {
  const key = crypto.createHash("sha256")
    .update(process.env.SSH_ENCRYPTION_PEPPER || "saturn-default-pepper-change-me")
    .digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * decryptCredential decrypts a credential string stored by encryptCredential.
 */
export function decryptCredential(text: string): string {
  const key = crypto.createHash("sha256")
    .update(process.env.SSH_ENCRYPTION_PEPPER || "saturn-default-pepper-change-me")
    .digest();
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

/**
 * getAuthToken extracts the JWT from an Authorization header.
 */
export function getAuthToken(req: { headers: { authorization?: string } }): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  return parts[1] || null;
}

/**
 * setAuthToken is a no-op on the server side (tokens are generated in login routes).
 * Provided for completeness / future use.
 */
export function setAuthToken(_token: string): void {
  // Tokens are handled by jsonwebtoken on creation; no server-side storage needed.
}
