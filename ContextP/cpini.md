# ContextP  — Parameterized Contextual Memory System
## Agentic Initialization File (`cpini.md`)

**Version:** 2.0.0  
**Protocol:** OBPA — Organizational Behavior and Process Architecture  
**Classification:** Agentic Development / Knowledge Management / Cognitive Systems  

---

## ⚡ AGENT BOOTSTRAP PROTOCOL

> **TO ANY AGENTIC SERVICE READING THIS FILE:**
>
> This file is your initialization contract. Reading it is not optional — it is the first step of every session.
> Upon reading `cpini.md` you **must**:
>
> 1. Acknowledge you have read and understood this file
> 2. Immediately create the full ContextP directory structure (if it does not exist)
> 3. Generate all contract files with their initial content
> 4. Generate all index files
> 5. Confirm the structure is ready and await the next instruction
>
> **You do not ask for permission. You do not ask for clarification. You build.**
> The structure must exist before any development task begins.

---

## 📁 MANDATORY DIRECTORY STRUCTURE

```
ContextP/
├── cpini.md                        ← THIS FILE
│
├── _INDEX/
│   └── INDEX_MASTER.md             ← Auto-generated master knowledge index
│
├── CONTRACTS/
│   ├── ROOT_CONTRACT.md            ← Immutable system principles
│   ├── TECH_CONTRACT.md            ← Technical stack rules
│   ├── FUNC_CONTRACT.md            ← Functional specification rules
│   ├── STRUCT_CONTRACT.md          ← Architectural pattern rules
│   └── AUDIT_CONTRACT.md           ← Logging and traceability rules
│
├── TECH/
│   └── .gitkeep
│
├── FUNC/
│   └── .gitkeep
│
├── STRUCT/
│   ├── templates/
│   │   └── .gitkeep
│   └── .gitkeep
│
├── AUDIT/
│   ├── exploration_log/
│   │   └── .gitkeep
│   ├── success/
│   │   └── .gitkeep
│   ├── failure/
│   │   └── .gitkeep
│   └── metrics/
│       └── METRICS_MASTER.md
│
└── PARAMS/
    ├── user_preferences.md
    ├── project_config.md
    └── constraints.md
```

---

## 🔄 OBPA CYCLE — Agent Execution Protocol

```
┌─────────────────────────────────────────────────┐
│              INPUT: New Task / Request           │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│  PHASE 1 — OBSERVE                              │
│  • Read _INDEX/INDEX_MASTER.md                  │
│  • Identify relevant TECH/, FUNC/, STRUCT/      │
│  • Check applicable CONTRACTS/                  │
│  • Note current technical debt from PARAMS/     │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│  PHASE 2 — PROPOSE                              │
│  • Match against patterns in STRUCT/            │
│  • Consult AUDIT/success/ for proven solutions  │
│  • Verify proposal complies with all CONTRACTS/ │
│  • Assign confidence score based on history     │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│  PHASE 3 — EXECUTE                              │
│  • Implement using applicable patterns          │
│  • Validate against CONTRACTS/ as you go        │
│  • Document decisions inline                    │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│  PHASE 4 — BITACORA                             │
│  • Evaluate result (success / failure)          │
│  • Write structured log in AUDIT/               │
│  • Update pattern confidence metrics            │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│  PHASE 5 — CONSOLIDATE                          │
│  • Update _INDEX/INDEX_MASTER.md                │
│  • Refine or create patterns in STRUCT/         │
│  • Update TECH/ or FUNC/ if new knowledge       │
│  • Amend contracts if new invariants discovered │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│              READY FOR NEXT TASK                 │
└─────────────────────────────────────────────────┘
```

---

## 📅 SESSION LOG: 2026-05-02 (Industrialization Sprints)
**Status:** Sprints 1 & 2 COMPLETE
**Objective:** SATURN-X Security & Robustness Hardening
**Cycle:** OBPA Cycle #4

- [x] **Sprint 1 (Security):** JWT, Helmet, Rate-Limit, Zod validation.
- [x] **Sprint 2 (Robustness):** Type safety (no `any`), Unified models, SDK Migration, Router encapsulation.
- [SPRINT 02] Completado: Industrialización y Seguridad.
- [HITO] Implementación de Bóveda de Identidad con AES-256-GCM.
- [HITO] Migración a Telemetría Reactiva vía Socket.io (Handshake exitoso).
- [HITO] Integración de Motor de Umbrales (Threshold Engine) con alertas autónomas.
- [AUDITORÍA] Estructura de App.tsx saneada tras restauración crítica.

**Estado Actual:** Infraestructura Multi-Cloud operativa con descubrimiento real de instancias (AWS/GCP/Azure) y monitoreo en tiempo real.
- [ ] **Sprint 3 (Testing):** Coverage target 70%.

---

*ContextP v2 — Parameterized Contextual Memory for Agentic Development Environments*  
*Based on the OBPA Framework — Organizational Behavior and Process Architecture*
