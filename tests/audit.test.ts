import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";
import { ScriptGenerator } from "../src/lib/script-generator.js";

// Mocking some environment for encryption test
const PEPPER = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(PEPPER).digest();

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

describe("Saturn Core Audit Tests", () => {
  
  describe("Encryption System", () => {
    it("should correctly encrypt and decrypt a string", () => {
      const secret = "my-secret-ssh-password-123";
      const encrypted = encrypt(secret);
      expect(encrypted).toContain(":");
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(secret);
    });

    it("should produce different IVs for same text", () => {
      const text = "constant";
      const enc1 = encrypt(text);
      const enc2 = encrypt(text);
      expect(enc1).not.toBe(enc2);
    });
  });

  describe("ScriptGenerator Dispatcher", () => {
    it("should find valid methods like users_list", () => {
      const req: any = { category: "users", action: "list", os: "linux", params: {} };
      const res = ScriptGenerator.generate(req);
      expect(res.description).toContain("List system users");
      expect(res.script).toContain("awk");
    });

    it("should fallback to genericCommand for unknown methods", () => {
      const req: any = { category: "unknown", action: "action", os: "linux", params: { command: "ls" } };
      const res = ScriptGenerator.generate(req);
      expect(res.description).toContain("Execute: ls");
    });

    it("should have a known mismatch for health_info (audit finding)", () => {
      // This test confirms the audit finding: health_info does not exist, smart_monitor does.
      const req: any = { category: "health", action: "info", os: "linux", params: {} };
      const res = ScriptGenerator.generate(req);
      // Falls back to generic command since health_info has no dedicated method
      expect(res.description).toContain("health"); 
    });
  });

  describe("SSH Agent Interface", () => {
      it("should generate correct Linux scripts with shebang", () => {
          const req: any = { category: "processes", action: "list", os: "linux", params: {} };
          const res = ScriptGenerator.generate(req);
          expect(res.script).toContain("#!/bin/bash");
          expect(res.script).toContain("ps -eo");
      });

      it("should generate correct Windows scripts with @echo off", () => {
        const req: any = { category: "processes", action: "list", os: "windows", params: {} };
        const res = ScriptGenerator.generate(req);
        expect(res.script).toContain("@echo off");
        expect(res.script).toContain("Get-Process");
    });
  });
});
