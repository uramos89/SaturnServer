import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import { encryptCredential as encrypt, logAudit } from "../lib/server-helpers.js";

// ── AI Providers list (2026) ────────────────────────────────────────────
const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", tier: "frontier", models: ["gpt-5", "gpt-5-mini", "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o1", "o1-mini", "o3-mini", "o4", "codex"] },
  { id: "anthropic", name: "Anthropic", tier: "frontier", models: ["claude-4.7", "claude-4.6", "claude-4-opus", "claude-4-sonnet", "claude-3.5-sonnet", "claude-3.5-haiku", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku"] },
  { id: "google", name: "Google AI (Gemini)", tier: "frontier", models: ["gemini-3-pro", "gemini-3-flash", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash", "gemma-3-27b", "gemma-3-12b", "gemma-2-27b"] },
  { id: "xai", name: "xAI (Grok)", tier: "frontier", models: ["grok-3", "grok-3-mini", "grok-2", "grok-2-mini", "grok-1.5", "grok-1"] },
  { id: "meta", name: "Meta (Llama)", tier: "frontier", models: ["llama-4-405b", "llama-4-90b", "llama-4-70b", "llama-4-8b", "llama-3.1-405b", "llama-3.1-70b", "llama-3.1-8b", "llama-3-70b", "llama-3-8b", "llama-guard-3"] },
  { id: "azure", name: "Microsoft Azure AI", tier: "hyperscaler", models: ["gpt-5-azure", "gpt-4o-azure", "gpt-4-turbo-azure", "o1-azure", "ma-voice", "ma-image", "ma-transcribe"] },
  { id: "aws", name: "Amazon AWS Bedrock", tier: "hyperscaler", models: ["claude-4-sonnet-bedrock", "claude-3.5-sonnet-bedrock", "llama-4-70b-bedrock", "mistral-large-bedrock", "titan-text-lite", "titan-embedding"] },
  { id: "gcp", name: "GCP Vertex AI", tier: "hyperscaler", models: ["gemini-3-pro-vertex", "gemini-2.5-pro-vertex", "claude-4-sonnet-vertex", "llama-4-70b-vertex", "mistral-large-vertex"] },
  { id: "openrouter", name: "OpenRouter (Multi-Proxy)", tier: "aggregator", models: ["openai/gpt-4o", "anthropic/claude-4-sonnet", "google/gemini-2.5-pro", "meta-llama/llama-4-70b", "mistralai/mistral-large", "deepseek/deepseek-v3", "qwen/qwen-110b"] },
  { id: "groq", name: "Groq (Ultra-Fast)", tier: "inference", models: ["llama-4-70b-groq", "llama-4-8b-groq", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it", "llama-guard-3-8b"] },
  { id: "together", name: "Together AI", tier: "inference", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x22b", "deepseek-coder-33b", "qwen-110b", "qwen-72b", "yi-34b"] },
  { id: "fireworks", name: "Fireworks AI", tier: "inference", models: ["llama-4-70b", "llama-v3-70b", "mixtral-8x7b", "deepseek-coder-33b", "qwen-72b-chat", "yi-34b"] },
  { id: "deepinfra", name: "DeepInfra", tier: "inference", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x22b", "codellama-34b", "mistral-7b"] },
  { id: "deepseek", name: "DeepSeek", tier: "value", models: ["deepseek-v4", "deepseek-v3", "deepseek-r1", "deepseek-coder-v2", "deepseek-chat", "deepseek-coder", "deepseek-v2"] },
  { id: "mistral", name: "Mistral AI", tier: "value", models: ["mistral-large-2", "mistral-medium", "mistral-small", "mixtral-8x22b", "mixtral-8x7b", "codestral", "ministral-8b", "ministral-3b"] },
  { id: "cohere", name: "Cohere", tier: "value", models: ["command-r-plus", "command-r", "command-a", "command-light", "aya-23", "embed-english-v3", "embed-multilingual-v3", "rerank-v3"] },
  { id: "perplexity", name: "Perplexity AI", tier: "value", models: ["pplx-70b", "pplx-8b", "sonar-pro", "sonar-small", "mixtral-8x7b-instruct", "llama-3-sonar-large"] },
  { id: "alibaba", name: "Alibaba (Qwen / DashScope)", tier: "asia", models: ["qwen-3-110b", "qwen-3-72b", "qwen-3-32b", "qwen-2.5-72b", "qwen-2.5-32b", "qwen-110b", "qwen-72b", "qwen-32b", "qwen-14b", "qwen-7b"] },
  { id: "baidu", name: "Baidu (ERNIE)", tier: "asia", models: ["ernie-4.5", "ernie-4.0", "ernie-3.5", "ernie-bot-turbo", "ernie-lite", "ernie-speed"] },
  { id: "tencent", name: "Tencent (Hunyuan)", tier: "asia", models: ["hunyuan-large", "hunyuan-standard", "hunyuan-lite", "hunyuan-code"] },
  { id: "zhipu", name: "Zhipu AI (GLM)", tier: "asia", models: ["glm-5", "glm-4", "glm-4v", "glm-4-plus", "glm-3-turbo", "glm-4v-plus"] },
  { id: "minimax", name: "MiniMax", tier: "asia", models: ["minimax-abab-7", "minimax-abab-6.5", "minimax-abab-5.5", "minimax-abab-5"] },
  { id: "moonshot", name: "Moonshot AI (Kimi)", tier: "asia", models: ["kimi-k2", "kimi-k1.5", "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"] },
  { id: "stepfun", name: "StepFun (Step)", tier: "asia", models: ["step-3", "step-2", "step-1v", "step-1"] },
  { id: "01ai", name: "01.AI (Yi)", tier: "asia", models: ["yi-large", "yi-medium", "yi-vision", "yi-34b", "yi-9b", "yi-6b"] },
  { id: "nvidia", name: "NVIDIA NIM", tier: "specialized", models: ["llama-4-70b-nim", "mixtral-8x22b-nim", "nemotron-4-340b", "nemotron-mini"] },
  { id: "ibm", name: "IBM Watsonx", tier: "specialized", models: ["granite-3-13b", "granite-3-8b", "granite-3-3b", "granite-13b", "granite-8b", "llama-4-70b-watsonx"] },
  { id: "huggingface", name: "Hugging Face Inference", tier: "specialized", models: ["mistral-7b", "llama-3-8b", "falcon-7b", "zephyr-7b", "codellama-34b", "phi-3", "phi-4", "qwen2-72b", "starcoder2"] },
  { id: "replicate", name: "Replicate", tier: "specialized", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x7b", "stable-diffusion-3.5", "flux-pro", "whisper", "musicgen"] },
  { id: "stability", name: "Stability AI", tier: "specialized", models: ["stable-diffusion-3.5", "stable-diffusion-3", "sd-xl", "stable-audio"] },
  { id: "elevenlabs", name: "ElevenLabs", tier: "specialized", models: ["eleven-multilingual-v2", "eleven-turbo-v2", "eleven-monolingual-v1"] },
  { id: "ollama", name: "Ollama (Local)", tier: "selfhosted", models: ["llama4", "llama3.2", "llama3.1", "llama3", "mistral", "mixtral", "codellama", "deepseek-coder", "deepseek-r1", "phi-4", "phi-3", "gemma-3", "gemma-2", "qwen2.5", "qwen2", "yi-34b", "falcon2", "starcoder2", "nemotron-mini"] },
  { id: "vllm", name: "vLLM (Self-Hosted)", tier: "selfhosted", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x22b", "qwen-110b", "qwen-72b", "deepseek-v3", "custom-endpoint"] },
  { id: "localai", name: "LocalAI", tier: "selfhosted", models: ["llama-4", "llama-3", "mistral", "phi-4", "phi-3", "falcon", "bert-embeddings", "whisper", "stable-diffusion", "text-to-speech"] },
  { id: "lmstudio", name: "LM Studio", tier: "selfhosted", models: ["lm-studio-default", "custom-local-model"] },
  { id: "textgen", name: "Oobabooga TextGen", tier: "selfhosted", models: ["textgen-default", "custom-textgen-model"] },
  { id: "kobold", name: "KoboldCPP", tier: "selfhosted", models: ["kobold-default", "custom-kobold-model"] },
  { id: "tabbyapi", name: "TabbyAPI", tier: "selfhosted", models: ["tabby-default", "custom-tabby-model"] },
  { id: "custom", name: "Custom Endpoint (OpenAI-compatible)", tier: "selfhosted", models: ["custom-model"] },
];

export function createAiRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/ai/providers
  router.get("/ai/providers", (req: Request, res: Response) => {
    const configured = db.prepare("SELECT * FROM ai_providers").all() as any[];
    res.json({ providers: AI_PROVIDERS, configured });
  });

  // POST /api/ai/providers/configure
  router.post("/ai/providers/configure", (req: Request, res: Response) => {
    const { providerId, model, apiKey, endpoint, name } = req.body;
    if (!providerId || !model) {
      return res.status(400).json({ error: "providerId and model are required" });
    }
    const id = `ai-${providerId}-${Date.now()}`;
    const createdAt = new Date().toISOString();

    db.prepare("UPDATE ai_providers SET enabled = 0 WHERE provider = ?").run(providerId);

    db.prepare(
      `INSERT OR REPLACE INTO ai_providers (id, name, provider, model, api_key, endpoint, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(id, name || providerId, providerId, model, apiKey ? encrypt(apiKey) : null, endpoint || null, createdAt);

    process.env.ACTIVE_AI_PROVIDER = providerId;
    if (apiKey) {
      process.env[`${providerId.toUpperCase()}_API_KEY`] = apiKey;
      if (providerId === "google") process.env.GEMINI_API_KEY = apiKey;
      if (providerId === "moonshot") process.env.MOONSHOT_API_KEY = apiKey;
      if (providerId === "openai") process.env.OPENAI_API_KEY = apiKey;
      if (providerId === "anthropic") process.env.ANTHROPIC_API_KEY = apiKey;
    }

    logAudit(db, "USER", "AI_PROVIDER_CONFIGURED", `AI provider ${providerId} configured with model ${model}`, {});
    res.json({ success: true, id, message: `${providerId} configured successfully` });
  });

  // GET /api/ai/config
  router.get("/ai/config", (req: Request, res: Response) => {
    const active = db.prepare("SELECT * FROM ai_providers WHERE enabled = 1").get() as any;
    res.json({
      configured: !!active,
      provider: active?.provider || "none",
      model: active?.model || "",
      name: active?.name || "",
      apiKey: "",
      deepVerify: process.env.AI_DEEP_VERIFY !== "false",
      autoRemediate: process.env.AI_AUTO_REMEDIATE === "true",
    });
  });

  // POST /api/ai/test-key
  router.post("/ai/test-key", async (req: Request, res: Response) => {
    const { providerId, model, apiKey, endpoint } = req.body;
    if (!providerId || !apiKey) {
      return res.status(400).json({ success: false, error: "providerId and apiKey are required" });
    }

    try {
      const testPrompt = "Respond with exactly one word: OK. No punctuation, no extra text.";
      let response = "";

      if (providerId === "google" || providerId === "gemini") {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const genModel = genAI.getGenerativeModel({ model: model || "gemini-2.5-flash" });
        const result = await genModel.generateContent(testPrompt);
        response = (await result.response).text();
      } else if (providerId === "openai") {
        const axios = (await import("axios")).default;
        const baseUrl = endpoint || "https://api.openai.com/v1";
        const r = await axios.post(
          `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
          { model: model || "gpt-4o", messages: [{ role: "user", content: testPrompt }], temperature: 0.1, max_tokens: 10 },
          { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 }
        );
        response = r.data.choices[0]?.message?.content || "";
      } else if (providerId === "anthropic") {
        const axios = (await import("axios")).default;
        const r = await axios.post(
          "https://api.anthropic.com/v1/messages",
          { model: model || "claude-3-haiku-20240307", max_tokens: 10, messages: [{ role: "user", content: testPrompt }] },
          { headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, timeout: 15000 }
        );
        response = r.data.content[0]?.text || "";
      } else {
        throw new Error(`Unsupported provider: ${providerId}. Supported: google, openai, anthropic`);
      }

      const trimmed = response.trim();
      if (trimmed.includes("OK") || trimmed.includes("ok")) {
        res.json({ success: true, message: `✅ ${providerId} key is valid (responded: "${trimmed.slice(0, 50)}")` });
      } else {
        res.json({ success: true, message: `✅ ${providerId} responded (${trimmed.slice(0, 50)}...)` });
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message?.slice(0, 300) || "Connection failed" });
    }
  });

  // POST /api/ai/config
  router.post("/ai/config", (req: Request, res: Response) => {
    const { provider, apiKey, deepVerify, autoRemediate, endpoint, model } = req.body;
    if (provider && apiKey) {
      process.env[`${provider.toUpperCase()}_API_KEY`] = apiKey;
      if (provider === "google" || provider === "gemini") process.env.GEMINI_API_KEY = apiKey;
      if (provider === "moonshot") process.env.MOONSHOT_API_KEY = apiKey;
      if (provider === "openai") process.env.OPENAI_API_KEY = apiKey;
      if (provider === "anthropic") process.env.ANTHROPIC_API_KEY = apiKey;
    }
    if (endpoint) process.env.AI_ENDPOINT = endpoint;
    process.env.AI_DEEP_VERIFY = deepVerify ? "true" : "false";
    process.env.AI_AUTO_REMEDIATE = autoRemediate ? "true" : "false";
    process.env.AI_PROVIDER = provider;
    if (model) process.env[`${provider.toUpperCase()}_MODEL`] = model;

    logAudit(db, "USER", "AI_CONFIG_UPDATED", `AI provider set to ${provider}. Deep-Verify: ${deepVerify}, Auto-Remediate: ${autoRemediate}`, {});
    res.json({ success: true, message: "AI configuration updated successfully" });
  });

  return router;
}
