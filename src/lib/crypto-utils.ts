import crypto from "crypto";

const ENCRYPTION_KEY = crypto.createHash("sha256").update(process.env.SSH_ENCRYPTION_PEPPER || "saturn-default-pepper-change-me").digest();
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypts a string using AES-256-CBC.
 * Returns format: "iv:encrypted" where iv is hex-encoded 16 bytes.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypts a string previously encrypted with encrypt().
 * Expects format: "iv:encrypted".
 */
export function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
