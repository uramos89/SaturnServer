import { describe, it, expect } from "vitest";

/**
 * Fuzz Testing — API Endpoints
 * Envía inputs malformados a los endpoints y espera que NO crasheen.
 * Los endpoints deben responder 400/404, nunca 500.
 */

const BASE = "http://192.168.174.134:3000";

const MALFORMED_PAYLOADS = [
  null,
  undefined,
  "",
  "not-json",
  "<xml><tag>value</tag></xml>",
  [],
  [1, 2, 3],
  { random: "data" },
  { password: "short" }, // < 8 chars
  { username: "a".repeat(1000), password: "valid1".repeat(10) },
  { username: "' OR '1'='1", password: "sql-injection" }, // SQLi
  { username: "../../etc/passwd", password: "path-traversal" }, // Path traversal
  { username: "<script>alert(1)</script>", password: "xss-test" }, // XSS
  { username: null, password: null },
  { username: {}, password: {} },
  { username: true, password: false },
];

const INVALID_IDS = [
  "nonexistent-id",
  "' OR '1'='1",
  "../../etc/passwd",
  "NaN",
  "null",
  "undefined",
  "<script>",
  " ".repeat(100),
];

const ENDPOINTS = [
  { method: "POST", path: "/api/admin/login", body: { username: "admin", password: "wrong" } },
  { method: "POST", path: "/api/admin/create", body: { username: "fuzz-test", password: "password123" } },
  { method: "GET", path: "/api/health" },
  { method: "GET", path: "/api/setup/status" },
];

describe("Fuzz: Endpoints with malformed payloads", () => {
  ENDPOINTS.forEach(({ method, path, body }) => {
    MALFORMED_PAYLOADS.forEach((payload) => {
      it(`[${method}] ${path} — payload: ${payload === undefined ? 'undefined' : JSON.stringify(payload).slice(0, 40)}`, async () => {
        const res = await fetch(`${BASE}${path}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "GET" ? undefined : JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        // Accept 200, 400, 401, 404 — REJECT 500
        expect(res.status).not.toBe(500);
      });
    });
  });
});

describe("Fuzz: Invalid IDs", () => {
  INVALID_IDS.forEach((id) => {
    it(`GET /api/skills/${id}`, async () => {
      const res = await fetch(`${BASE}/api/skills/${encodeURIComponent(id)}`);
      // Should return 401 (no auth), 404 (not found) or 400 (bad request)
      expect([400, 401, 404]).toContain(res.status);
    });
  });
});

describe("Fuzz: Missing content-type", () => {
  it("POST /api/admin/login without content-type", async () => {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      body: "raw string body",
    });
    expect(res.status).not.toBe(500);
  });

  it("POST with extremely large body (10k chars)", async () => {
    const largeBody = { username: "a".repeat(10000), password: "b".repeat(10000) };
    const res = await fetch(`${BASE}/api/admin/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(largeBody),
    });
    expect(res.status).not.toBe(500);
  });
});
