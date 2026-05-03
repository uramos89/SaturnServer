# Saturn Autonomous Administrative System (v0.8.0)

Saturn is an advanced, AI-driven server administration platform designed for heterogeneous environments (Linux & Windows) across on-premise and multi-cloud infrastructures. Saturn leverages the **ARES Neural Engine** with **Aegis Auto-Generation Pipeline** to autonomously generate, validate, and execute administrative scripts via SSH and WinRM.

## 🚀 Key Features

### 1. Multi-Cloud & Hybrid Management
- **Cloud Connectors**: Native support for AWS (SSM, Instance Connect), GCP (IAP Tunnel), and Azure.
- **Identity Vault**: Encrypted credential storage (`IDENTITY/credentials_vault`) using AES-256-GCM.
- **Auto-Discovery**: Automatic scanning and inventory population from cloud accounts.

### 2. Autonomous Administration
- **System**: User/Group management, Process monitoring, and Task scheduling (Cron/Task Scheduler).
- **Security**: Advanced Firewall management (iptables/ufw/Windows Firewall) and SSL management (Certbot).
- **Web & Apps**: Configuration of Nginx, Apache, IIS, and Virtual Hosts.
- **Health & Protection**: SMART disk monitoring and automated backup policies (rsync/robocopy).

### 3. 🤖 Aegis Auto-Generation Pipeline (NEW)
- **Self-generating skills**: ARES generates new skills autonomously when no existing skill matches an incident.
- **Hierarchical domain matching**: `cpu.process`, `disk.fs.mount_full`, `memory.process.leak` — 16+ incident domains.
- **Anti-recurrencia**: Max 3 generations per incident, 10-minute cooldown on failures.
- **Skill cache**: 1-hour TTL to avoid redundant LLM calls for repeated incidents.
- **Deterministic fallback**: Immediate response (sub-5s) while Aegis generates a custom skill in background.
- **Validation + Dry-run**: Every generated skill passes syntax check (shellcheck/PSScriptAnalyzer), security scan, and remote dry-run before execution.
- **Chunking**: Skills >100 lines are split into checkpoints for resumable execution.
- **Smart purge**: Auto-generated skills are purged by success rate (not age). Skills with >80% success rate over 5+ executions are promoted to permanent (`persistent-`).
- **Feedback loop**: Administrators rate skills (1-5) to improve future generation prompts.

### 4. 🤖 Multi-Provider AI (NEW)
- **30+ AI providers**: OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral, Ollama (local), and 25+ more.
- **Local model support**: Gemma 4 via Ollama for core processes — always available, zero token cost.
- **Automatic fail-over**: If cloud API fails (no tokens, network issues), falls back to local model transparently.
- **Token optimization**: Routine checks (thresholds, metrics) use local model. Complex tasks use cloud API when available.
- **Provider-agnostic**: Add any OpenAI-compatible provider from the UI without touching code.

### 5. Advanced Security & Compliance
- **Compliance Audit**: Unified logging with metadata for GDPR, PCI-DSS, and HIPAA compliance.
- **SSH Hardening**: Automated root login disabling, port rotation, and security benchmarks.
- **Identity Proxy**: Access to private instances via Bastion/IAP tunnels without public IPs.

### 6. Real-time Monitoring & Incident Response
- **Alert Engine**: Threshold-based notifications for CPU, RAM, and Disk health.
- **Incident Dashboard**: Tracking and resolution of system incidents with AI-driven root cause analysis.
- **Live Stream**: Real-time metrics visualization via SSE and Socket.io.
- **Reactive Communication**: Alerts and commands via Telegram bot with full conversational flow.

## 🛠 Tech Stack
- **Backend**: Node.js, Express, Better-SQLite3, node-ssh.
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Framer Motion.
- **AI**: Multi-provider (OpenAI, Anthropic, Gemini, Ollama, 30+ more) via ARES Neural Engine + Aegis auto-generation.
- **Memory**: ContextP system — persistent organizational memory with OBPA cycle (Observe, Propose, Execute, Log, Consolidate).

## 📁 Project Structure
- `server.ts`: Central bootstrap, metrics loop, alert engine, and DB schema.
- `src/App.tsx`: Immersive dashboard with 12 administrative dimensions.
- `src/lib/ares-worker.ts`: ARES Neural Engine — incident analysis, proactive activities, Aegis pipeline.
- `src/lib/script-generator.ts`: OS-agnostic administrative template engine.
- `src/lib/script-validator.ts`: Syntax validation, security scanning, and remote dry-run.
- `src/lib/ssh-agent.ts`: High-performance remote execution agent.
- `src/services/llm-service.ts`: Multi-provider AI service with automatic fail-over.
- `ContextP/`: Organizational memory system with contracts, audits, and indexed knowledge.

## 📜 Compliance & Audit
Saturn logs every administrative action with:
- **Event ID & Type**: (USER, SYSTEM, NEURAL, COMPLIANCE, AEGIS)
- **Metadata**: Compliance tags (GDPR/PCI-DSS/HIPAA), command snippets, and session context.
- **Timestamp**: High-precision UTC recording for audit trails.
- **Aegis audit**: Every auto-generated skill stores the exact prompt, LLM response, and validation results.

## 🚀 Quick Deployment (Linux)
To install or update Saturn on a remote Linux server, run the following command:

```bash
curl -s https://raw.githubusercontent.com/uramos89/SaturnServer/main/install.sh | bash
```

### Manual Installation
1. **Clone**: `git clone https://github.com/uramos89/SaturnServer.git`
2. **Install**: `npm install`
3. **Build**: `npm run build`
4. **Environment**: Configure `.env` (PEPPER, JWT, PORT)
5. **Start**: `npm run dev` (development) or `pm2 start ecosystem.config.cjs` (production)
6. **Configure AI**: Access the Setup Wizard at `http://localhost:3000` to configure your AI provider and/or install Ollama for local inference.

## 📦 Aegis Skills System
Saturn ships with 30+ pre-installed skills:
- **System**: Backup Manager, Process Manager, Cron Manager, User Manager
- **Security**: Firewall Manager, Windows Firewall, SSH Hardening, SSL/Certbot, SMART Monitor
- **Web Services**: Nginx, Apache, IIS, Windows Task Scheduler, Robocopy
- **Auto-generated**: Aegis creates new skills on-demand, which become permanent if they prove reliable (>80% success rate over 5+ executions)
