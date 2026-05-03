import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

/**
 * Tests for the encrypt/decrypt functions used in server.ts.
 * These are duplicated here for isolated testing — the actual
 * implementation lives in server.ts and uses AES-256-CBC.
 */

const ENCRYPTION_KEY = crypto.createHash("sha256").update("test-pepper-for-unit-tests").digest();
const ALGORITHM = "aes-256-cbc";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

describe('Encryption utilities (AES-256-CBC)', () => {
  it('should correctly encrypt and decrypt a string', () => {
    const original = 'supersecret-api-key-12345';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(original);
    expect(encrypted).not.toBe(original);
  });

  it('should produce different IVs for same text (no deterministic output)', () => {
    const text = 'same-text';
    const encrypted1 = encrypt(text);
    const encrypted2 = encrypt(text);

    // Different IVs → different ciphertext
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should handle empty strings', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('should handle special characters', () => {
    const original = '!@#$%^&*()_+{}[]|:;"<>,.?/~`';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should handle very long strings', () => {
    const original = 'a'.repeat(10000);
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should throw on corrupted ciphertext', () => {
    const encrypted = encrypt('valid-data');
    const corrupted = encrypted.slice(0, -5) + 'XXXXX';
    expect(() => decrypt(corrupted)).toThrow();
  });

  it('should throw on invalid format', () => {
    expect(() => decrypt('invalid-format-no-colon')).toThrow();
  });

  it('should encrypt with length-prefixed format (iv:payload)', () => {
    const encrypted = encrypt('hello');
    const [iv, payload] = encrypted.split(':');
    // IV should be 32 hex chars (16 bytes)
    expect(iv.length).toBe(32);
    expect(payload).toBeDefined();
    expect(payload.length).toBeGreaterThan(0);
  });
});
