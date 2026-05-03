/**
 * LLM Service — Multi-Provider Universal
 *
 * Arquitectura:
 *   Cualquier proveedor que implemente la API OpenAI /v1/chat/completions
 *   se configura desde la UI sin tocar código.
 *
 *   Proveedores nativos (formato propio): Gemini, Anthropic
 *   OpenAI-compatibles (automático): ~23 proveedores
 *
 *   Agregar un nuevo provider = solo config en DB + UI.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import axios from "axios";
import type Database from "better-sqlite3";

let db: Database.Database | null = null;

export function initLLMService(database?: Database.Database): void {
  db = database || null;
}

// ── Registry unificado de proveedores ──────────────────────────────
// CUALQUIER provider OpenAI-compatible funciona automáticamente.
// Solo se hardcodean los que tienen API diferente (Gemini, Anthropic).

interface ProviderConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  api_key: string | null;
  endpoint: string | null;
  enabled: number;
  created_at: string;
}

type ApiFormat = "openai" | "gemini" | "anthropic" | "ollama" | "unknown";

function detectFormat(providerId: string): ApiFormat {
  if (["google", "gemini"].includes(providerId)) return "gemini";
  if (providerId === "anthropic") return "anthropic";
  if (providerId === "ollama") return "ollama";
  return "openai"; // Default: todos los demás son OpenAI-compatibles
}

// ── Decrypt (same key derivation as server.ts) ──────────────────────
function decrypt(text: string): string {
  const pepper = process.env.SSH_ENCRYPTION_PEPPER || "";
  if (!pepper) return text;
  const key = crypto.createHash("sha256").update(pepper).digest();
  const parts = text.split(":");
  if (parts.length < 2) return text;
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts.slice(1).join(":");
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  } catch { return text; }
}

// ── Resolver configuración activa ──────────────────────────────────
function resolveActive(): { apiKey: string; model: string; endpoint: string; format: ApiFormat; provider: string } {
  let providerId = process.env.AI_PROVIDER || "";
  let apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || "";
  let model = process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || "";
  let endpoint = process.env.AI_ENDPOINT || "";

  // Prefer DB config
  if (db) {
    try {
      const row = db.prepare("SELECT * FROM ai_providers WHERE enabled = 1 LIMIT 1").get() as ProviderConfig | undefined;
      if (row) {
        providerId = row.provider;
        model = row.model || model;
        endpoint = row.endpoint || endpoint;
        const rawKey = row.api_key || "";
        apiKey = rawKey.includes(":") ? decrypt(rawKey) : rawKey;
      }
    } catch {}
  }

  // Fallbacks for well-known providers
  if (!apiKey) {
    if (providerId === "google" || providerId === "gemini") apiKey = process.env.GEMINI_API_KEY || "";
    else if (providerId === "openai") apiKey = process.env.OPENAI_API_KEY || "";
    else if (providerId === "anthropic") apiKey = process.env.ANTHROPIC_API_KEY || "";
    else apiKey = process.env[`${providerId.toUpperCase()}_API_KEY`] || "";
  }

  if (!model) {
    const format = detectFormat(providerId);
    if (format === "gemini") model = "gemini-2.5-flash";
    else if (format === "openai") model = "gpt-4o";
    else if (format === "anthropic") model = "claude-3-5-sonnet-20241022";
    else if (format === "ollama") model = "llama3";
  }

  return { apiKey, model, endpoint, format: detectFormat(providerId), provider: providerId };
}

// ── Callers unificados ──────────────────────────────────────────────

async function callOpenAI(providerId: string, model: string, apiKey: string, endpoint: string, prompt: string): Promise<string> {
  const SYSTEM_PROMPT = "You are ARES (Autonomous Remediation Engine for Saturn), an expert systems administrator and infrastructure automation specialist. Respond in JSON when requested.";

  const baseUrl = endpoint || getDefaultBaseUrl(providerId);
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const res = await axios.post(url, {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 4096,
  }, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 60000,
  });

  return res.data.choices?.[0]?.message?.content || "";
}

function getDefaultBaseUrl(providerId: string): string {
  const urls: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    groq: "https://api.groq.com/openai/v1",
    together: "https://api.together.xyz/v1",
    fireworks: "https://api.fireworks.ai/inference/v1",
    deepinfra: "https://api.deepinfra.com/v1/openai",
    deepseek: "https://api.deepseek.com/v1",
    openrouter: "https://openrouter.ai/api/v1",
    perplexity: "https://api.perplexity.ai",
    replicate: "https://api.replicate.com/v1",
    nvidia: "https://integrate.api.nvidia.com/v1",
    huggingface: "https://api-inference.huggingface.co/v1",
    anthropic: "https://api.anthropic.com/v1", // not used for OpenAI calls
  };
  return urls[providerId] || "https://api.openai.com/v1";
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({ model });
  const result = await genModel.generateContent(prompt);
  return (await result.response).text();
}

async function callAnthropic(model: string, apiKey: string, prompt: string): Promise<string> {
  const res = await axios.post("https://api.anthropic.com/v1/messages", {
    model, max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  }, {
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    timeout: 60000,
  });
  return res.data.content?.[0]?.text || "";
}

async function callOllama(model: string, endpoint: string, prompt: string): Promise<string> {
  const url = `${(endpoint || "http://localhost:11434").replace(/\/+$/, "")}/api/generate`;
  const res = await axios.post(url, { model, prompt, stream: false }, { timeout: 120000 });
  return res.data.response || "";
}

// ── API Pública ────────────────────────────────────────────────────

/**
 * Obtiene respuesta de CUALQUIER proveedor configurado.
 *
 * @param provider - ID del proveedor (opcional, usa el activo si se omite)
 * @param prompt - Prompt a enviar
 * @returns Texto de respuesta
 */
export async function getLLMResponse(provider: string, prompt: string): Promise<string> {
  const config = resolveActive();
  const pId = provider || config.provider;
  const fmt = detectFormat(pId);

  // Si el provider no tiene API key propia, usar la del activo
  const key = config.apiKey || process.env[`${pId.toUpperCase()}_API_KEY`] || "";
  const mdl = config.model || process.env[`${pId.toUpperCase()}_MODEL`] || "";
  const ep = config.endpoint || process.env.AI_ENDPOINT || "";

  if (!key) throw new Error(`No API key configured for ${pId}. Configure a provider in Settings.`);

  switch (fmt) {
    case "gemini":
      return callGemini(mdl || "gemini-2.5-flash", key, prompt);
    case "anthropic":
      return callAnthropic(mdl || "claude-3-5-sonnet-20241022", key, prompt);
    case "ollama":
      return callOllama(mdl || "llama3", ep, prompt);
    case "openai":
    default:
      return callOpenAI(pId, mdl || "gpt-4o", key, ep, prompt);
  }
}
