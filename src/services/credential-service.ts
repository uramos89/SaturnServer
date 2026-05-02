import fs from 'fs';
import crypto from 'crypto';

/**
 * Decrypts a credential file from the Saturn Identity Vault.
 * Uses AES-256-GCM with a master key derived from SATURN_MASTER_KEY.
 * 
 * @param vaultPath - Absolute path to the encrypted .age file
 * @returns The decrypted JSON object
 */
export function decryptCredential(vaultPath: string): any {
  if (!fs.existsSync(vaultPath)) {
    throw new Error(`Credential file not found: ${vaultPath}`);
  }

  const data = fs.readFileSync(vaultPath);
  
  // Data format: [IV(12)][TAG(16)][ENCRYPTED_DATA(...)]
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  
  const masterKey = process.env.SATURN_MASTER_KEY;
  if (!masterKey || masterKey === 'saturn-default-secret') {
    throw new Error("[SECURITY] SATURN_MASTER_KEY must be set to a secure secret in .env");
  }
  const key = crypto.scryptSync(masterKey, 'salt', 32);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = decipher.update(encrypted) + decipher.final('utf8');
  return JSON.parse(decrypted);
}
