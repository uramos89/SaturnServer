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

// ── Task Routing / Fail-over System ──────────────────────────────────

export type TaskComplexity = "basic" | "complex";

interface LocalProvider { id: string; model: string; endpoint: string; }
interface CloudProvider { id: string; model: string; apiKey: string; endpoint: string; format: ApiFormat; }

let localProvider: LocalProvider | null = null;
let cloudProvider: CloudProvider | null = null;
let cloudFailingSince: number | null = null;
const CLOUD_COOLDOWN_MS = 60000; // 1 min antes de reintentar cloud
let tokenBudget: number | null = null; // null = sin límite
let tokensUsedThisCycle = 0;

/**
 * Inicializa los proveedores local y cloud desde la DB.
 */
export function initDualProviders(): void {
  if (!db) return;
  try {
    // Provider local (Ollama)
    const local = db.prepare("SELECT * FROM ai_providers WHERE provider = 'ollama' AND enabled = 1 LIMIT 1").get() as any;
    if (local) {
      localProvider = { id: local.id, model: local.model || "qwen2.5-coder:1.5b", endpoint: local.endpoint || "http://localhost:11434" };
      console.log(`[LLM] Local provider: ${local.model} at ${localProvider.endpoint}`);
    }

    // Provider cloud (cualquier enabled que NO sea ollama)
    const cloud = db.prepare("SELECT * FROM ai_providers WHERE provider != 'ollama' AND enabled = 1 LIMIT 1").get() as any;
    if (cloud) {
      const rawKey = cloud.api_key || "";
      const apiKey = rawKey.includes(":") ? decrypt(rawKey) : rawKey;
      cloudProvider = {
        id: cloud.id, model: cloud.model, apiKey,
        endpoint: cloud.endpoint || "", format: detectFormat(cloud.provider)
      };
      console.log(`[LLM] Cloud provider: ${cloud.provider}/${cloud.model}`);
      cloudFailingSince = null;
    }
  } catch (e: any) {
    console.warn("[LLM] initDualProviders error:", e.message);
  }
}

/**
 * Configura un límite de tokens por ciclo.
 */
export function setTokenBudget(maxTokens: number): void {
  tokenBudget = maxTokens;
  tokensUsedThisCycle = 0;
}

/**
 * Decide qué proveedor debe manejar una tarea según su complejidad y estado.
 * Retorna: { provider, model, endpoint, apiKey, format }
 */
function routeTask(complexity: TaskComplexity): {
  provider: string; model: string; endpoint: string; apiKey: string; format: ApiFormat;
} {
  const isCloudAvailable = cloudProvider && cloudProvider.apiKey;
  const isCloudOnCooldown = cloudFailingSince !== null &&
    (Date.now() - cloudFailingSince) < CLOUD_COOLDOWN_MS;
  const isOverBudget = tokenBudget !== null && tokensUsedThisCycle >= tokenBudget;

  // Tareas basicas SIEMPRE van al local
  if (complexity === "basic" && localProvider) {
    return {
      provider: "ollama",
      model: localProvider.model,
      endpoint: localProvider.endpoint,
      apiKey: "",
      format: "ollama"
    };
  }

  // Tareas complejas: intentar cloud si disponible
  if (complexity === "complex" && isCloudAvailable && !isCloudOnCooldown && !isOverBudget) {
    return {
      provider: cloudProvider!.id,
      model: cloudProvider!.model,
      endpoint: cloudProvider!.endpoint,
      apiKey: cloudProvider!.apiKey,
      format: cloudProvider!.format
    };
  }

  // Fallback: si cloud no disponible o en cooldown o over budget, usar local
  if (localProvider) {
    console.log(`[LLM] ❌ Cloud unavailable (cooldown:${isCloudOnCooldown}, overBudget:${isOverBudget}), using local fallback`);
    return {
      provider: "ollama",
      model: localProvider.model,
      endpoint: localProvider.endpoint,
      apiKey: "",
      format: "ollama"
    };
  }

  // Sin local ni cloud — error
  throw new Error("No AI provider available. Configure Ollama (local) or a cloud provider.");
}

/**
 * Marca el cloud como fallido para activar cooldown.
 */
function markCloudFailed(): void {
  cloudFailingSince = Date.now();
  console.warn(`[LLM] ⚠️ Cloud provider marked as failed. Cooldown: ${CLOUD_COOLDOWN_MS / 1000}s`);
}

/**
 * Obtiene respuesta del proveedor con fail-over automático.
 */
export async function getLLMResponse(provider: string, prompt: string, complexity: TaskComplexity = "complex"): Promise<string> {
  // Si se especificó un proveedor exacto (no routing), usarlo directamente
  if (provider && provider !== "auto") {
    return callProvider(provider, prompt);
  }

  // Routing automático según complejidad
  const target = routeTask(complexity);

  if (target.format === "ollama") {
    try {
      return await callOllama(target.model, target.endpoint, prompt);
    } catch (e: any) {
      throw new Error(`Local model failed: ${e.message}`);
    }
  }

  // Intentar cloud, con fail-over
  try {
    const result = await callProviderByFormat(target.format, target.model, target.apiKey, target.endpoint, target.provider, prompt);
    return result;
  } catch (e: any) {
    markCloudFailed();
    // Fail-over a local
    if (localProvider) {
      console.log("[LLM] 🔁 Fail-over: cloud failed, retrying with local model");
      return await callOllama(localProvider.model, localProvider.endpoint, prompt);
    }
    throw new Error(`Cloud failed: ${e.message}. No local fallback available.`);
  }
}

/**
 * Llama a un proveedor exacto por su ID (sin routing).
 */
async function callProvider(providerId: string, prompt: string): Promise<string> {
  const config = resolveActive();
  const fmt = detectFormat(providerId);
  const key = config.apiKey || process.env[`${providerId.toUpperCase()}_API_KEY`] || "";
  const mdl = config.model || "";
  const ep = config.endpoint || "";

  if (!key && fmt !== "ollama") throw new Error(`No API key for ${providerId}`);

  return callProviderByFormat(fmt, mdl, key, ep, providerId, prompt);
}

async function callProviderByFormat(format: ApiFormat, model: string, apiKey: string, endpoint: string, providerId: string, prompt: string): Promise<string> {
  switch (format) {
    case "gemini":
      return callGemini(model || "gemini-2.5-flash", apiKey, prompt);
    case "anthropic":
      return callAnthropic(model || "claude-3-5-sonnet-20241022", apiKey, prompt);
    case "ollama":
      return callOllama(model || "qwen2.5-coder:1.5b", endpoint, prompt);
    case "openai":
    default:
      return callOpenAI(providerId, model || "gpt-4o", apiKey, endpoint, prompt);
  }
}

/**
 * Consulta el estado del motor local (Ollama).
 */
export async function getLocalModelStatus(): Promise<{
  ollama_running: boolean; model: string; ram_usage: string; status: string; error?: string;
}> {
  try {
    const { execSync } = await import("child_process");
    const ps = execSync("ps aux | grep '[o]llama' | head -1", { encoding: "utf8", timeout: 3000 });
    if (!ps.trim()) {
      return { ollama_running: false, model: "", ram_usage: "0", status: "error", error: "Ollama process not found" };
    }
    const parts = ps.trim().split(/\s+/);
    const ramMb = parts[5] ? (parseInt(parts[5]) / 1024).toFixed(1) : "0";
    const model = localProvider?.model || "unknown";
    // Verificar que responde
    try {
      const axios = (await import("axios")).default;
      await axios.get((localProvider?.endpoint || "http://localhost:11434") + "/api/tags", { timeout: 3000 });
      return { ollama_running: true, model, ram_usage: `${ramMb}MB`, status: "ready" };
    } catch {
      return { ollama_running: true, model, ram_usage: `${ramMb}MB`, status: "loading" };
    }
  } catch (e: any) {
    return { ollama_running: false, model: "", ram_usage: "0", status: "error", error: e.message };
  }
}
