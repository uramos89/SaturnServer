import pkg from 'enquirer';
const { Select, Input, Confirm, Toggle, MultiSelect } = pkg;

import pc from 'picocolors';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const DOTENV_PATH = path.join(process.cwd(), '.env');
const SETUP_JSON_PATH = path.join(process.cwd(), 'setup.json');

// ═══════════════════════════════════════════════════════════════════════
// AI PROVIDERS — Complete list matching server.ts
// ═══════════════════════════════════════════════════════════════════════

interface AIProviderDef {
  id: string;
  name: string;
  tier: string;
  models: string[];
}

const AI_PROVIDERS: AIProviderDef[] = [
  // ═══ FRONTIER ═══
  { id: "openai", name: "OpenAI", tier: "frontier", models: ["gpt-5", "gpt-5-mini", "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o1", "o1-mini", "o3-mini"] },
  { id: "anthropic", name: "Anthropic", tier: "frontier", models: ["claude-4.7-sonnet", "claude-4.6-sonnet", "claude-4-opus", "claude-4-sonnet", "claude-3.5-sonnet", "claude-3.5-haiku"] },
  { id: "google", name: "Google AI (Gemini)", tier: "frontier", models: ["gemini-3-pro", "gemini-3-flash", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"] },
  { id: "xai", name: "xAI (Grok)", tier: "frontier", models: ["grok-3", "grok-3-mini", "grok-2", "grok-2-mini"] },
  { id: "meta", name: "Meta (Llama API)", tier: "frontier", models: ["llama-4-405b", "llama-4-90b", "llama-4-70b", "llama-4-8b", "llama-3.1-405b"] },

  // ═══ HYPERSCALERS ═══
  { id: "azure", name: "Microsoft Azure AI", tier: "hyperscaler", models: ["gpt-5-azure", "gpt-4o-azure", "gpt-4-turbo-azure", "o1-azure"] },
  { id: "aws", name: "Amazon AWS Bedrock", tier: "hyperscaler", models: ["claude-4-sonnet-bedrock", "claude-3.5-sonnet-bedrock", "llama-4-70b-bedrock", "mistral-large-bedrock"] },
  { id: "gcp", name: "GCP Vertex AI", tier: "hyperscaler", models: ["gemini-3-pro-vertex", "gemini-2.5-pro-vertex", "claude-4-sonnet-vertex", "llama-4-70b-vertex"] },

  // ═══ AGGREGATORS ═══
  { id: "openrouter", name: "OpenRouter (Multi-Proxy)", tier: "aggregator", models: ["openai/gpt-4o", "anthropic/claude-4-sonnet", "google/gemini-2.5-pro", "meta-llama/llama-4-70b", "deepseek/deepseek-v3"] },

  // ═══ INFERENCE ═══
  { id: "groq", name: "Groq (Ultra-Fast)", tier: "inference", models: ["llama-4-70b-groq", "llama4-8b-groq", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"] },
  { id: "together", name: "Together AI", tier: "inference", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x22b", "deepseek-coder-33b"] },
  { id: "fireworks", name: "Fireworks AI", tier: "inference", models: ["llama-4-70b", "llama-v3-70b", "mixtral-8x7b"] },
  { id: "deepinfra", name: "DeepInfra", tier: "inference", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x22b", "codellama-34b"] },

  // ═══ VALUE ═══
  { id: "deepseek", name: "DeepSeek", tier: "value", models: ["deepseek-v4", "deepseek-v3", "deepseek-r1", "deepseek-coder-v2", "deepseek-chat"] },
  { id: "mistral", name: "Mistral AI", tier: "value", models: ["mistral-large-2", "mistral-medium", "mistral-small", "mixtral-8x22b", "mixtral-8x7b", "codestral"] },
  { id: "cohere", name: "Cohere", tier: "value", models: ["command-r-plus", "command-r", "command-a", "command-light"] },
  { id: "perplexity", name: "Perplexity AI", tier: "value", models: ["sonar-pro", "sonar-small", "llama-3-sonar-large"] },

  // ═══ ASIAN ═══
  { id: "alibaba", name: "Alibaba (Qwen / DashScope)", tier: "asia", models: ["qwen-3-110b", "qwen-3-72b", "qwen-3-32b", "qwen-2.5-72b", "qwen-2.5-32b"] },
  { id: "baidu", name: "Baidu (ERNIE)", tier: "asia", models: ["ernie-4.5", "ernie-4.0", "ernie-3.5", "ernie-bot-turbo"] },
  { id: "tencent", name: "Tencent (Hunyuan)", tier: "asia", models: ["hunyuan-large", "hunyuan-standard", "hunyuan-lite"] },
  { id: "zhipu", name: "Zhipu AI (GLM)", tier: "asia", models: ["glm-5", "glm-4", "glm-4v", "glm-4-plus"] },
  { id: "minimax", name: "MiniMax", tier: "asia", models: ["minimax-abab-7", "minimax-abab-6.5", "minimax-abab-5.5"] },
  { id: "moonshot", name: "Moonshot AI (Kimi)", tier: "asia", models: ["kimi-k2", "kimi-k1.5", "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"] },
  { id: "stepfun", name: "StepFun (Step)", tier: "asia", models: ["step-3", "step-2", "step-1v"] },
  { id: "01ai", name: "01.AI (Yi)", tier: "asia", models: ["yi-large", "yi-medium", "yi-vision", "yi-34b"] },

  // ═══ SPECIALIZED ═══
  { id: "nvidia", name: "NVIDIA NIM", tier: "specialized", models: ["llama-4-70b-nim", "mixtral-8x22b-nim", "nemotron-4-340b"] },
  { id: "ibm", name: "IBM Watsonx", tier: "specialized", models: ["granite-3-13b", "granite-3-8b", "granite-3-3b"] },
  { id: "huggingface", name: "Hugging Face Inference", tier: "specialized", models: ["mistral-7b", "llama-3-8b", "falcon-7b", "phi-4", "starcoder2"] },
  { id: "replicate", name: "Replicate", tier: "specialized", models: ["llama-4-70b", "mixtral-8x7b", "flux-pro"] },

  // ═══ SELF-HOSTED ═══
  { id: "ollama", name: "Ollama (Local)", tier: "selfhosted", models: ["llama4", "llama3.2", "llama3.1", "llama3", "mistral", "mixtral", "codellama", "deepseek-coder", "deepseek-r1", "phi-4", "phi-3", "gemma-3", "gemma-2", "qwen2.5", "qwen2"] },
  { id: "vllm", name: "vLLM (Self-Hosted)", tier: "selfhosted", models: ["llama-4-70b", "llama-3-70b", "mixtral-8x22b", "qwen-110b", "qwen-72b", "deepseek-v3"] },
  { id: "localai", name: "LocalAI", tier: "selfhosted", models: ["llama-4", "llama-3", "mistral", "phi-4", "phi-3", "falcon"] },
  { id: "lmstudio", name: "LM Studio", tier: "selfhosted", models: ["lm-studio-default"] },
  { id: "custom", name: "Custom Endpoint (OpenAI-compatible)", tier: "selfhosted", models: ["custom-model"] },
];

const TIER_ORDER = ['frontier', 'hyperscaler', 'aggregator', 'inference', 'value', 'asia', 'specialized', 'selfhosted'];
const TIER_LABELS: Record<string, string> = {
  frontier: '🌟 Frontier (Top Tier)',
  hyperscaler: '☁️ Hyperscalers & Aggregators',
  aggregator: '🔀 Multi-Proxy Aggregators',
  inference: '⚡ High-Performance Inference',
  value: '💰 Value (Cost-Effective)',
  asia: '🌏 Asian Ecosystem',
  specialized: '🔧 Specialized / Niche',
  selfhosted: '🏠 Self-Hosted / Local',
};

// ═══════════════════════════════════════════════════════════════════════

async function checkDependencies() {
  console.log(pc.cyan('\n[Step 0] Checking System Dependencies...'));
  const deps = ['node', 'npm', 'git', 'pm2'];
  const missing = [];

  for (const dep of deps) {
    try {
      execSync(`which ${dep}`, { stdio: 'ignore' });
      console.log(`${pc.green('✔')} ${dep} is installed`);
    } catch (e) {
      console.log(`${pc.red('✘')} ${dep} is missing`);
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    const { install } = await new Confirm({
      name: 'install',
      message: `Some dependencies are missing (${missing.join(', ')}). Try to install them?`
    }).run();

    if (install) {
      const pm = missing.includes('docker') ? 'docker.io' : '';
      console.log(pc.yellow(`Please run: sudo apt-get update && sudo apt-get install -y ${missing.join(' ')}`));
    }
  }
}

async function handleExistingConfig() {
  if (fs.existsSync(DOTENV_PATH)) {
    const { action } = await new Select({
      name: 'action',
      message: '⚙️  Existing configuration found. What would you like to do?',
      choices: [
        { name: 'keep', message: 'Keep current configuration', value: 'keep' },
        { name: 'modify', message: 'Modify AI provider only', value: 'modify' },
        { name: 'reset', message: 'Reset to defaults', value: 'reset' }
      ]
    }).run();

    if (action === 'keep') {
      console.log(pc.green('Maintaining existing config. Skipping configuration steps.'));
      return 'keep';
    }
    if (action === 'reset') {
      console.log(pc.yellow('Keeping .env but will overwrite AI configuration.'));
      return 'modify';
    }
    return 'modify';
  }
  return 'new';
}

async function setupAI(): Promise<{
  providerId: string;
  providerName: string;
  model: string;
  apiKey: string;
  endpoint: string;
  format: string;
}> {
  console.log(pc.cyan('\n[Step 1] AI Engine & Remediation Core'));
  console.log(pc.dim('Select from 40+ providers and 200+ models.'));

  // Step 1a: Select tier/category
  const tierChoices = TIER_ORDER
    .filter(t => AI_PROVIDERS.some(p => p.tier === t))
    .map(t => ({
      name: t,
      message: TIER_LABELS[t],
      value: t,
    }));

  const { selectedTier } = await new Select({
    name: 'selectedTier',
    message: 'Select a category:',
    choices: tierChoices,
  }).run();

  // Step 1b: Select provider
  const providersInTier = AI_PROVIDERS.filter(p => p.tier === selectedTier);
  const providerChoices = providersInTier.map(p => ({
    name: p.id,
    message: `${p.name} (${p.models.length} models)`,
    value: p.id,
  }));

  const { selectedProvider } = await new Select({
    name: 'selectedProvider',
    message: 'Select AI provider:',
    choices: providerChoices,
  }).run();

  const providerDef = AI_PROVIDERS.find(p => p.id === selectedProvider)!;

  // Step 1c: Select model
  const modelChoices = providerDef.models.map(m => ({
    name: m,
    message: m,
    value: m,
  }));

  const { selectedModel } = await new Select({
    name: 'selectedModel',
    message: `Select model for ${providerDef.name}:`,
    choices: modelChoices,
  }).run();

  // Step 1d: API Key (optional for local providers)
  const needsApiKey = !['ollama', 'vllm', 'localai', 'lmstudio', 'textgen', 'kobold', 'tabbyapi', 'custom'].includes(providerDef.id);
  let apiKey = '';
  if (needsApiKey) {
    apiKey = await new Input({
      name: 'apiKey',
      message: `Enter your ${providerDef.name} API Key:`,
      validate: (value) => value.length > 0 ? true : 'API Key is required for this provider',
    }).run();
  } else {
    console.log(pc.yellow(`ℹ  ${providerDef.name} runs locally — no API key needed.`));
  }

  // Step 1e: Custom endpoint (optional)
  let endpoint = '';
  const needsEndpoint = providerDef.id === 'custom' || providerDef.tier === 'selfhosted';
  if (needsEndpoint) {
    endpoint = await new Input({
      name: 'endpoint',
      message: `Enter the API endpoint URL for ${providerDef.name}:`,
      initial: providerDef.id === 'ollama' ? 'http://localhost:11434' : 'http://localhost:8000/v1',
      validate: (value) => value.startsWith('http') ? true : 'Must start with http:// or https://',
    }).run();
  }

  // Step 1f: Confirm
  console.log(pc.dim('\n──────────────────────────────────────'));
  console.log(`${pc.bold('Provider:')}  ${providerDef.name}`);
  console.log(`${pc.bold('Model:')}     ${selectedModel}`);
  console.log(`${pc.bold('API Key:')}   ${apiKey ? '••••' + apiKey.slice(-4) : 'N/A (local)'}`);
  console.log(`${pc.bold('Endpoint:')}  ${endpoint || 'Default (API default)'}`);
  console.log(pc.dim('──────────────────────────────────────'));

  // Determine API format for the LLM service
  let format = 'openai'; // default (OpenAI-compatible)
  if (providerDef.id === 'google' || providerDef.id === 'gemini') format = 'gemini';
  else if (providerDef.id === 'anthropic') format = 'anthropic';
  else if (providerDef.id === 'ollama') format = 'ollama';
  else if (providerDef.id === 'moonshot') format = 'moonshot';

  return {
    providerId: providerDef.id,
    providerName: providerDef.name,
    model: selectedModel,
    apiKey,
    endpoint,
    format,
  };
}

async function setupNetwork() {
  console.log(pc.cyan('\n[Step 2] Gateway & Network Security'));

  const { port } = await new Input({
    name: 'port',
    message: 'Set the HTTP port for Saturn Server:',
    initial: '3000',
    validate: (val) => !isNaN(parseInt(val)) ? true : 'Must be a number',
  }).run();

  const { enableToken } = await new Toggle({
    name: 'enableToken',
    message: 'Enable API Security Token (recommended)?',
    enabled: 'Yes',
    disabled: 'No',
  }).run();

  let apiToken = '';
  if (enableToken) {
    apiToken = crypto.randomBytes(32).toString('hex');
    console.log(pc.green(`✔ Generated Secure Token: ${apiToken}`));
  }

  return { port, apiToken };
}

async function setupSystemd(port: string) {
  const { installService } = await new Confirm({
    name: 'installService',
    message: 'Would you like to install Saturn as a systemd service (daemon)?'
  }).run();

  if (installService) {
    const user = process.env.USER || 'ubuntu';
    const workingDir = process.cwd();
    const serviceContent = `[Unit]
Description=Saturn Infrastructure Management Platform
After=network.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${workingDir}
Environment=NODE_ENV=production
Environment=PORT=${port}
ExecStart=$(which tsx) server.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

    const servicePath = `/tmp/saturn.service`;
    fs.writeFileSync(servicePath, serviceContent);
    console.log(pc.cyan('\nSystemd service unit generated at ' + servicePath));
    console.log(pc.yellow('To enable it, run:'));
    console.log(`sudo cp ${servicePath} /etc/systemd/system/saturn.service`);
    console.log('sudo systemctl daemon-reload');
    console.log('sudo systemctl enable saturn');
    console.log('sudo systemctl start saturn');
  }
}

async function main() {
  console.log(pc.bold(pc.magenta('\n🪐 SATURN SERVER SETUP WIZARD v2.0')));
  console.log(pc.dim('Provider-agnostic onboarding — configure any AI model'));

  await checkDependencies();
  const configAction = await handleExistingConfig();
  if (configAction === 'keep') return;

  // Step 1: AI Provider
  const ai = await setupAI();

  // Step 2: Network
  const net = await setupNetwork();

  // Step 3: Summary & Apply
  console.log(pc.cyan('\n[Step 3] Summary & Application'));
  console.log(pc.dim('────────────────────────────────────────'));
  console.log(`${pc.bold('AI Provider:')}  ${ai.providerName}`);
  console.log(`${pc.bold('Model:')}        ${ai.model}`);
  console.log(`${pc.bold('Format:')}       ${ai.format}`);
  console.log(`${pc.bold('Port:')}         ${net.port}`);
  console.log(`${pc.bold('Auth Token:')}   ${net.apiToken ? 'Enabled' : 'Disabled'}`);
  console.log(pc.dim('────────────────────────────────────────'));

  const { confirm } = await new Confirm({
    name: 'confirm',
    message: 'Apply changes and generate configuration?'
  }).run();

  if (!confirm) {
    console.log(pc.yellow('Setup cancelled. No changes applied.'));
    return;
  }

  // ── Generate .env ───────────────────────────────────────────────────
  let envContent = '';
  if (fs.existsSync(DOTENV_PATH)) {
    envContent = fs.readFileSync(DOTENV_PATH, 'utf-8');
  }

  // Build the .env content
  const envVars: Record<string, string> = {
    PORT: net.port,
    NODE_ENV: 'production',
    APP_URL: `http://localhost:${net.port}`,
  };

  // AI Provider env vars
  const providerKey = ai.providerId.toUpperCase();
  if (ai.apiKey) {
    envVars[`${providerKey}_API_KEY`] = ai.apiKey;
    if (ai.providerId === 'google') envVars['GEMINI_API_KEY'] = ai.apiKey;
    if (ai.providerId === 'moonshot') envVars['MOONSHOT_API_KEY'] = ai.apiKey;
    if (ai.providerId === 'openai') envVars['OPENAI_API_KEY'] = ai.apiKey;
    if (ai.providerId === 'anthropic') envVars['ANTHROPIC_API_KEY'] = ai.apiKey;
  }

  if (ai.endpoint) {
    envVars['AI_ENDPOINT'] = ai.endpoint;
    envVars[`${providerKey}_ENDPOINT`] = ai.endpoint;
  }

  if (ai.model) {
    envVars[`${providerKey}_MODEL`] = ai.model;
    envVars['AI_MODEL'] = ai.model;
  }

  envVars['AI_PROVIDER'] = ai.providerId;
  envVars['ACTIVE_AI_PROVIDER'] = ai.providerId;

  if (net.apiToken) {
    envVars['SATURN_API_TOKEN'] = net.apiToken;
  }

  // Generate security keys if missing
  ['SSH_ENCRYPTION_PEPPER', 'JWT_SECRET', 'SATURN_MASTER_KEY'].forEach(key => {
    if (!envContent.includes(`${key}=`) && !envVars[key]) {
      envVars[key] = crypto.randomBytes(32).toString('hex');
    }
  });

  // Merge into .env
  for (const [key, val] of Object.entries(envVars)) {
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${val}`);
    } else {
      envContent += `\n${key}=${val}`;
    }
  }

  fs.writeFileSync(DOTENV_PATH, envContent.trim() + '\n');
  console.log(pc.green('\n✔ .env file updated successfully.'));

  // ── Generate setup.json for DB seeding ──────────────────────────────
  const setupData = {
    version: '2.0',
    aiProvider: {
      id: `ai-${ai.providerId}-init`,
      name: ai.providerName,
      provider: ai.providerId,
      model: ai.model,
      apiKey: ai.apiKey,
      endpoint: ai.endpoint,
      enabled: 1,
      createdAt: new Date().toISOString(),
    },
    network: {
      port: parseInt(net.port),
      apiToken: net.apiToken || '',
    },
  };

  fs.writeFileSync(SETUP_JSON_PATH, JSON.stringify(setupData, null, 2));
  console.log(pc.green('✔ setup.json created for DB seeding on first launch.'));

  // ── systemd (optional) ──────────────────────────────────────────────
  await setupSystemd(net.port);

  console.log(pc.bold(pc.green('\n✨ Saturn is ready!')));
  console.log(pc.dim('────────────────────────────────────────'));
  console.log(`Frontend: ${pc.cyan(`http://localhost:${net.port}`)}`);
  console.log(`AI:       ${pc.cyan(ai.providerName)} → ${pc.cyan(ai.model)}`);
  console.log(pc.dim('────────────────────────────────────────'));
  console.log(`Start with:  ${pc.cyan('pm2 start ecosystem.config.js')}`);
  console.log(`Or dev:      ${pc.cyan('npm run dev')}`);
  console.log(`Re-run:      ${pc.cyan('npm run setup')}`);
}

main().catch(console.error);
