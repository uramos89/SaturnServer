# Saturn 🪐

**Autonomous Infrastructure Management Platform**

Saturn is an open-source platform for centralized, intelligent management of heterogeneous servers (Linux, Windows, Unix). It not only monitors — it **diagnoses, learns, and remediates** failures autonomously, powered by the **Ares neural engine** and **ContextP organizational memory**.

> 🌍 **International**: Full English UI with Español toggle. Default: English.
> 🧠 **Neural Engine**: Ares v1.0 — isolated, self-updating, multi-provider LLM.
> 📚 **Memory**: ContextP — Git-versioned knowledge base with semantic search.
> 🔒 **Security**: SSH/WinRM with AES-256 encrypted credentials at rest.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React 18 + TypeScript + Vite) │  :80
├─────────────────────────────────────────┤
│  Backend / API Core (Node.js + Express)  │  :3000
├─────────────────────────────────────────┤
│  Ares Neural Engine (Python/FastAPI)     │  :50051
│  └── ContextP Memory (Git + embeddings)  │
├─────────────────────────────────────────┤
│  SQLite + Litestream (Backup to S3)      │
├─────────────────────────────────────────┤
│  SSH Agent (ssh2/node-ssh) + WinRM       │
└─────────────────────────────────────────┘
```

---

## Quick Start

### Requirements
- **Linux (Ubuntu/Debian)** or Windows with WSL2
- Docker & Docker Compose
- Git
- An API key for one of the supported LLM providers (optional for monitor-only mode)

### One-Click Deployment

```bash
curl -sSL https://raw.githubusercontent.com/uramos89/SaturnServer/main/install.sh | bash
```

Or manually:

```bash
git clone https://github.com/uramos89/SaturnServer.git
cd SaturnServer
cp .env.example .env
# Edit .env with your API keys
docker compose up -d
```

Open **http://localhost:80** in your browser.

### Development

```bash
npm install
npm run dev    # Frontend on :5173, Backend on :3000
```

---

## Key Features

### 🔍 Autonomous Monitoring
- Real-time SSH health checks (CPU, RAM, disk, uptime, kernel, load average)
- WebSocket/SSe streaming for live metrics
- Heterogeneous support: Linux (SSH), Windows (WinRM), Unix (SSH)

### 🧠 Ares Neural Engine (OBPA-v4 Cycle)
| Phase | Description |
|-------|-------------|
| **OBSERVE** | Ingests real-time metrics and server state |
| **PROPOSE** | Matches patterns in ContextP + enriches LLM prompt |
| **EXECUTE** | Generates remediation scripts with sandbox validation |
| **BITÁCORA** | Logs every action in AUDIT/ with full traceability |
| **CONSOLIDATE** | Updates ContextP indices and refines contracts |

**Supported LLM Providers:**
- Google Gemini (recommended)
- OpenAI
- Anthropic Claude
- Ollama (local)

Configure AI from the **Settings** panel in the UI — no server-side config needed.

### 📚 ContextP — Organizational Memory
Inspired by the ContextP paper, Saturn maintains a **versioned knowledge base** as a Git repository:

```
ContextP/
├── _INDEX/       ── Master index and search indices
├── CONTRACTS/    ── Ethical & technical constraints (5 levels)
│   ├── ROOT_CONTRACT.md
│   ├── TECH_CONTRACT.md
│   └── ...
├── TECH/         ── Technical knowledge by stack
├── FUNC/         ── Functional solutions by domain
├── STRUCT/       ── Architectural patterns & templates
├── AUDIT/        ── Structured execution logs
└── PARAMS/       ── User preferences & constraints
```

Every intervention creates a **Git commit**, providing full traceability and rollback capability.

### 🔐 SSH Real Connectivity
- Connect to any server via SSH directly from the UI
- AES-256 encrypted credential storage
- Execute commands and scripts remotely
- Real-time system metrics streaming
- Automatic OBPA remediation execution

---

## Technical Requirements

### Functional
| ID | Requirement | Status |
|----|------------|--------|
| F01 | Multi-platform monitoring (Linux/Windows/Unix) | ✅ |
| F02 | Real-time health checks via SSH/WinRM | ✅ |
| F03 | Autonomous incident detection and classification | ✅ |
| F04 | LLM-powered diagnosis and remediation | ✅ |
| F05 | User approval workflow for remediation | ✅ |
| F06 | Organizational memory with full versioning | ✅ |
| F07 | Multi-language UI (EN/ES) | ✅ |
| F08 | AI provider configuration from UI | ✅ |
| F09 | SSH connection management from UI | ✅ |
| F10 | Notification pipeline (Slack/Email/Webhook) | ✅ |

### Technical
| ID | Requirement | Implementation |
|----|------------|----------------|
| T01 | One-script deployment | `install.sh` + Docker Compose |
| T02 | Neural engine isolation | Ares in separate container (blue-green) |
| T03 | SQLite + Litestream backup | Continuous replication to S3 |
| T04 | Credential encryption | AES-256-GCM at rest |
| T05 | Scalability to 10K+ nodes | Connection pooling + goroutines |
| T06 | 99.9% dashboard availability | Health-checked containers |
| T07 | Audit compliance | Git-versioned ContextP AUDIT/ |

---

## Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | For AI features |
| `OPENAI_API_KEY` | OpenAI API key | Alternative |
| `SSH_ENCRYPTION_PEPPER` | Pepper for credential encryption | Yes |
| `APP_URL` | Public URL of the instance | Yes |
| `LITESTREAM_REPLICA_URL` | S3 URL for backups | Optional |

### UI Configuration
Access **Settings → AI Provider Configuration** from the web interface to:
1. Select your LLM provider (Gemini, OpenAI, Ollama, Anthropic)
2. Enter your API key
3. Toggle Deep-Verify or Auto-Remediate modes
4. Save — no server restart needed

### Language
Toggle **EN/ES** in the top navigation bar. Persisted in `localStorage`.

---

## Project Structure

```
saturn/
├── src/
│   ├── App.tsx            ── Main application
│   ├── main.tsx           ── Entry point with splash screen
│   ├── index.css          ── Styles + splash animations
│   └── lib/
│       ├── types.ts       ── TypeScript interfaces
│       ├── i18n.ts        ── Internationalization (EN/ES)
│       ├── utils.ts       ── Utility functions
│       └── ssh-agent.ts   ── SSH engine (ssh2/node-ssh)
├── server.ts              ── Express backend
├── Dockerfile             ── Container build
├── docker-compose.yml     ── Stack orchestration
├── litestream.yml         ── SQLite backup config
├── scripts/
│   └── init-contextp.sh   ── ContextP Git initializer
└── install.sh             ── One-click deployment
```

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgements

- **ContextP Paper** — Organizational memory architecture inspiration
- **ssh2** — SSH connectivity engine
- **Litestream** — SQLite continuous replication
- **Motion** — Animation library
- **Lucide** — Icon set
- **Recharts** — Charting library

---

*"Saturn automates the infrastructure so you can focus on the architecture."*
