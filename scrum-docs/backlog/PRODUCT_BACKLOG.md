# 📋 Product Backlog — Saturn Server

> Proyecto: [github.com/uramos89/SaturnServer](https://github.com/uramos89/SaturnServer)
> **Descripción:** Plataforma autónoma de administración de servidores (Linux & Windows) impulsada por IA.
> **Stack:** Node.js, Express, React, Vite, Tailwind, Better-SQLite3, Google Gemini
>
> **Última actualización:** 2026-05-04

---

## 📐 Épicas del Proyecto (del README oficial)

| # | Épica | Feature del README |
|---|---|---|
| EP-01 | **Cloud Connectors** | AWS SSM, GCP IAP Tunnel, Azure — descubrimiento automático |
| EP-02 | **Identity Vault** | Almacenamiento encriptado AES-256-GCM de credenciales |
| EP-03 | **ARES Neural Engine** | Generación y ejecución de scripts con IA (Gemini) |
| EP-04 | **Remote Execution** | SSH y WinRM para servidores Linux y Windows |
| EP-05 | **Alert Engine** | Notificaciones threshold-based (CPU, RAM, Disk) |
| EP-06 | **Incident Dashboard** | Tracking y resolución con análisis de causa raíz por IA |
| EP-07 | **ContextP Memory** | Conocimiento arquitectónico persistente |
| EP-08 | **Compliance Audit** | Logs unificados para GDPR, PCI-DSS, HIPAA |
| EP-09 | **System Management** | Usuarios, procesos, tareas programadas |
| EP-10 | **Security Hardening** | Firewall, SSL/Certbot, SSH hardening |
| EP-11 | **Health & Backup** | SMART disk, rsync/robocopy backups |
| EP-12 | **Identity Proxy** | Bastion/IAP tunnels para instancias privadas |
| EP-13 | **Live Stream** | Métricas en tiempo real vía SSE y Socket.io |
| EP-14 | **Comunicación Reactiva** | Alertas y comandos vía Telegram, WhatsApp. Bidireccional |
| EP-15 | **Web Services** | Gestión de Nginx, Apache, IIS, Virtual Hosts |

---

## ✅ SPRINTS COMPLETADOS

### Sprint 0 — Auditoría Inicial (Completado ✅)
Auditoría de código, matriz de cumplimiento, gap analysis.

### Sprint 1 — Frontend-Backend Integración (Completado ✅)
Conexión frontend a backend real, matriz de funcionalidad.

### Sprint 2 — Proactive Executor (Completado ✅)
ARES Worker, thresholds, pause/resume.

### Sprint 3 — Notificaciones + Webhooks (Completado ✅)
Multi-canal, DELETE endpoints.

### Sprint 4 — Cloud Connectors (Completado ✅)
AWS/GCP/Azure scan, Identity Proxy.



### Sprint 1 — Auditoría y estabilización (Completado ✅)
17 US. Gemini 2.5 Flash, fixes de decrypt, credentials, errores silenciosos.

### Sprint 2 — Proactive Executor (Completado ✅)
6 US. Worker ejecuta actividades proactivas cada 60s, threshold detection.

### Sprint 3 — Notificaciones + Webhooks (Completado ✅)
5 US. `notification-service.ts` multi-canal, webhooks desde UI.

### Sprint 4 — Cloud Connectors (Completado ✅)
5 US. SSM exec + discovery, Bastion Proxy, Cloud Scan (AWS/GCP/Azure).

### Sprint 5 — Seguridad JWT + Telegram Reactivo (Completado ✅)
8 US. JWT middleware global, Telegram Bot con flujo conversacional completo, ContextP integrado.

### Sprint 6 — Skills de Sistema (Completado ✅)
5 US. Backup Manager, Process Manager, Cron Manager skills.

---

## 📦 SPRINT 7 — Security Hardening Skills (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-045 | Firewall Manager skill (iptables/ufw) | EP-10 | 5 | ✅ Done |
| US-046 | Windows Firewall skill (powershell) | EP-10 | 3 | ✅ Done |
| US-047 | SSL/Certbot Manager skill | EP-10 | 5 | ✅ Done |
| US-048 | SSH Hardening skill | EP-10 | 3 | ✅ Done |
| US-049 | SMART Disk Monitor skill | EP-11 | 3 | ✅ Done |

## 📦 SPRINT 8 — System & Web Services Skills (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-050 | User/Group Manager skill | EP-09 | 3 | ✅ Done |
| US-051 | Nginx Manager skill | EP-15 | 5 | ✅ Done |
| US-052 | Apache Manager skill | EP-15 | 5 | ✅ Done |
| US-053 | IIS Manager skill (Windows) | EP-15 | 5 | ✅ Done |
| US-054 | Windows Task Scheduler skill | EP-09 | 3 | ✅ Done |
| US-055 | Robocopy Backup skill | EP-11 | 3 | ✅ Done |

## 📦 SPRINT 9 — Cloud & Compliance (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-056 | GCP IAP Tunnel | EP-12 | 5 | 📝 Backlog (pendiente gcloud CLI) |
| US-057 | AWS Instance Connect | EP-01 | 3 | 📝 Backlog (pendiente infra AWS) |
| US-058 | Compliance Audit completo | EP-08 | 5 | ✅ Done |
| US-059 | Compliance Reports | EP-08 | 5 | ✅ Done |
| US-060 | Notificaciones WhatsApp | EP-14 | 8 | 📝 Backlog (pendiente Meta API) |

## 📦 SPRINT 10 — Frontend & Live Stream (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-061 | Live Metrics Dashboard | EP-13 | 5 | ⚠️ Backend listo, falta frontend dedicado |
| US-062 | Notifications Tab dedicada | EP-05 | 5 | ✅ Done |
| US-063 | ContextP Explorer mejorado | EP-07 | 3 | ✅ Done |
| US-064 | Poblar tabla contextp_entries | EP-07 | 3 | ✅ Done |

---

## 📦 SPRINT 11 — Live Metrics Dashboard (⚠️ Pendiente)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-065 | Server Selector en Dashboard | EP-13 | 3 | ✅ Done |
| US-066 | Gauges CPU/RAM/Disk en tiempo real | EP-13 | 5 | ✅ Done |
| US-067 | Charts históricos (60 puntos) | EP-13 | 5 | ✅ Done |
| US-068 | Buffer de métricas frontend | EP-13 | 3 | ✅ Done |
| US-069 | Auto-suscripción Socket.io | EP-13 | 2 | ✅ Done |

## 📦 SPRINT 12 — Unit Tests (⚠️ Pendiente)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-070 | threshold-engine tests | TD-003 | 5 | ✅ Done |
| US-071 | notification-service tests | TD-003 | 5 | ✅ Done |
| US-072 | ssh-agent tests | TD-003 | 3 | ✅ Done |
| US-073 | telegram-service tests | TD-003 | 3 | ✅ Done |

## 📦 SPRINT 13 — Refactor server.ts (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-074 | Extraer encrypt/decrypt a utils | TD-002 | 3 | ✅ Done |
| US-075 | Extraer DB schema | TD-002 | 2 | ✅ Done |
| US-076 | Extraer seed de admin | TD-002 | 1 | ✅ Done |
| US-077 | Extraer rutas a routers modulares | TD-002 | 8 | ✅ Done |
| US-078 | server.ts como bootstrap | TD-002 | 2 | ✅ Done |

## 📦 SPRINT 14 — Aegis Auto-Generation Pipeline (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-079 | Endpoint generate-skill | EP-03 | 5 | ✅ Done |
| US-080 | ARES Auto-Generation en remediación | EP-03 | 8 | ✅ Done |
| US-081 | Pipeline E2E completo | EP-03 | 5 | ✅ Done |
| US-082 | Auto-limpieza y versionado | EP-03 | 3 | ✅ Done |
| US-083 | Anti-recurrencia + cache (1h TTL) | EP-03 | 3 | ✅ Done |
| US-084 | Validador + dry-run + chunking | EP-03 | 5 | ✅ Done |
| US-085 | Feedback loop + promoción a permanente | EP-03 | 3 | ✅ Done |

## 📦 SPRINT 15 — Motor Local Qwen + Fail-Over (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-086 | Instalación automática Ollama+Qwen (3 modos) | EP-03 | 5 | ✅ Done |
| US-087 | Wizard selección modelo (Auto/Manual/Expert) | EP-03 | 3 | ✅ Done |
| US-088 | Dual-provider routing (basic→local, complex→cloud) | EP-03 | 5 | ✅ Done |
| US-089 | Fail-over automático (cloud→local con cooldown) | EP-03 | 3 | ✅ Done |
| US-090 | Token optimizer (budget configurable) | EP-03 | 2 | ✅ Done |
| US-091 | Endpoint GET /api/neural/local-status | EP-03 | 1 | ✅ Done |

## 📦 SPRINT 16 — Frontend Fixes + Deploy (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| US-092 | Fix AI test (resultado persistente) | — | 1 | ✅ Done |
| US-093 | UI configurar notificaciones (webhook/telegram/email) | EP-05 | 5 | ✅ Done |
| US-094 | Botón Test en cada canal de notificación | EP-05 | 2 | ✅ Done |
| US-095 | Global thresholds sliders (CPU/RAM/Disk) | EP-05 | 3 | ✅ Done |
| US-096 | E2E Playwright test suite | TD-003 | 5 | ✅ Done |
| US-097 | Product backlog actualizado con sprints 11-16 | — | 2 | ✅ Done |

---

## 📦 Backlog Técnico (Tech Debt)

| ID | Título | Prioridad | Esfuerzo | Estado | Descripción |
|---|---|---|---|---|---|
| TD-002 | Refactor: unificar nomenclatura frontend-backend | 🟡 Media | 5 | ✅ Done (Sprint 13) | Estandarizar camelCase vs snake_case |
| TD-003 | Tests automatizados | 🟡 Media | 8 | ✅ Done (Sprint 16) | Playwright E2E + 11 tests unitarios existentes |
| TD-004 | Error handling consistente | 🟡 Media | 3 | 📝 Pendiente | Unificar formato de errores en respuestas API |
| TD-005 | SSE (Server-Sent Events) | 🔵 Baja | 3 | 📝 Pendiente | Implementar SSE como alternativa a Socket.io |
| TD-006 | Windows parity completo | 🟡 Media | 8 | ⚠️ Parcial | 5 skills Windows listas, faltan algunas |

---

## 📦 SPRINT 17 — Security Headers + Fixes (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| P2-005 | Security Headers (HSTS, X-XSS-Protection, Permissions-Policy) | EP-10 | 3 | ✅ Done |
| — | Fixes: auth TDZ, ContextP sync, mass assignment, XSS stored | — | 5 | ✅ Done |

## 📦 SPRINT 18 — Auditoría Destructiva + Test Lab (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| — | Test Lab Docker (4 contenedores SSH) | — | 8 | ✅ Done |
| — | Pentest militar: 150+ ataques, 94% score | EP-08 | 8 | ✅ Done |
| — | STRIDE threat model (6 módulos, 17 amenazas) | EP-08 | 5 | ✅ Done |

## 📦 SPRINT 19 — Security Remediation (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| P0-001 | Body parser limit + typeof validation | EP-10 | 3 | ✅ Done |
| P0-002 | SSRF blocklist (metadata, hex, decimal, privadas) | EP-10 | 5 | ✅ Done |
| P0-003 | SyntaxError handler (protocol smuggling) | EP-10 | 2 | ✅ Done |
| P1-004 | Body limit 1MB middleware | EP-10 | 1 | ✅ Done |
| P2-005 | Helmet HSTS + XSS-Protection + Permissions | EP-10 | 2 | ✅ Done |
| — | 641 ataques auditados, 0 criticals | — | — | ✅ Done |

## 📦 SPRINT 20 — E2E Validation + SSRF (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| — | SSRF over-blocking fix (permite IPs privadas, bloquea metadata) | EP-10 | 3 | ✅ Done |
| — | Playwright E2E tests (3/3 pasan) | TD-003 | 5 | ✅ Done |
| — | Server detail panel (config, eliminar nodo, SSH port) | — | 5 | ✅ Done |

## 📦 SPRINT 21 — Compliance ISO 27001/NIST/OWASP (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| — | SATURN SECURITY SUITE v1.0 (SAST/SCA/DAST/FUZZ/PENTEST) | EP-08 | 8 | ✅ Done |
| — | Security Gate criteria (GO/NO-GO) | EP-08 | 3 | ✅ Done |
| — | Mapping NIST 800-53, OWASP Top 10, ISO 27001, MITRE ATT&CK | EP-08 | 5 | ✅ Done |

## 📦 SPRINT 22 — Enterprise Compliance (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| PRO-SEC-TESTING-01 | Testing procedure (SAST/SCA/DAST/Fuzz/Pentest) | EP-08 | 5 | ✅ Done |
| PRO-SEC-PENTEST-01 | Pentesting procedure (PTES 5 fases) | EP-08 | 3 | ✅ Done |
| CHK-SEC-RELEASE-01 | Release checklist (15 mandatory points) | EP-08 | 3 | ✅ Done |
| REG-SEC-VULN-01 | Vulnerability registry (8 closed, 0 active) | EP-08 | 2 | ✅ Done |
| POL-SEC-SSDLC-01 | SSDLC policy | EP-08 | 3 | ✅ Done |
| — | CI/CD ready: automatic pipeline gates | — | 3 | ✅ Done |

## 📦 SPRINT 23 — Competitive Analysis + CI/CD (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| — | Comparative analysis Saturn vs 9 platforms | — | 5 | ✅ Done |
| — | Gap analysis (lo único de Saturn vs lo que falta) | — | 5 | ✅ Done |
| — | CI/CD pipeline script | — | 3 | ✅ Done |

## 📦 SPRINT 24 — Roadmap Autonomía + AIOps (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| — | AIOps Comparative: Dynatrace Davis, Datadog Watchdog, Watsonx, NebulaOps | — | 5 | ✅ Done |
| — | Autonomous Infrastructure Maturity Model (Niveles 0-5) | — | 3 | ✅ Done |
| — | Roadmap 3 fases: Lite → Semi-Autonomous → Autonomous | — | 3 | ✅ Done |

## 📦 SPRINT 25 — Prometheus + Grafana (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| — | /api/metrics endpoint (Prometheus exposition format) | EP-13 | 5 | ✅ Done |
| — | 9 métricas: servers, online, cpu, mem, disk, incidents, skills, users, audit | EP-13 | 3 | ✅ Done |
| — | Grafana dashboard (gauges CPU/RAM/Disk + stats) | EP-13 | 5 | ✅ Done |
| — | Prometheus scrape config (target UP ✅) | EP-13 | 3 | ✅ Done |
| — | Roadmap Nivel 4+ documentado | — | 3 | ✅ Done |

## 📦 SPRINT 26 — ML Anomaly Detection (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| — | Python anomaly-engine.py (IsolationForest, scikit-learn) | EP-06 | 8 | ✅ Done |
| — | POST /api/neural/anomaly endpoint | EP-06 | 5 | ✅ Done |
| — | ML Engine entrenado con 1000 muestras sintéticas | EP-06 | 5 | ✅ Done |
| — | Fallback threshold-based | EP-06 | 2 | ✅ Done |

## 📦 SPRINT 27 — Root Cause Analysis + Prophet (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| — | POST /api/neural/rca: Root Cause Analysis con LLM | EP-06 | 8 | ✅ Done |
| — | GET /api/neural/predict/:metric: Predicción con Prophet | EP-06 | 8 | ✅ Done |
| — | Python prediction-engine.py (time-series forecasting) | EP-06 | 5 | ✅ Done |
| — | Fallback estadístico (tendencia basada en históricos) | EP-06 | 3 | ✅ Done |

## 📦 SPRINT 28 — Frontend Fixes + Server Detail (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| — | Server detail panel: Config tab (SSH + thresholds) | — | 5 | ✅ Done |
| — | Delete server with try/catch | — | 2 | ✅ Done |
| — | Port field orange highlight | — | 1 | ✅ Done |
| — | Fix encryptCredential import (ESM) | — | 2 | ✅ Done |
| — | Fix AddNodeModal port state + password toggle | — | 3 | ✅ Done |

## 📦 SPRINT 29 — Frontend Remediation (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| B-001 | `E.map is not a function` — Safe array fallbacks | — | 3 | ✅ Done |
| B-002 | `r.filter is not a function` — Safe array fallbacks | — | 2 | ✅ Done |
| B-003 | ContextP tab no accesible — Error handling + empty state | — | 2 | ✅ Done |
| B-004 | Notifications con 3 errores JS — Fixed | — | 3 | ✅ Done |
| B-005 | Administration con 11 errores JS — Fixed | — | 3 | ✅ Done |
| B-006 | Skills sin contenido real — Empty state message | — | 2 | ✅ Done |
| B-007 | Terminal pobre — History up/down + persistence | — | 5 | ✅ Done |
| B-008 | Resultados desaparecen — Tab data cache | — | 3 | ✅ Done |

## 📦 SPRINT 30 — Session Security (Completado ✅)

| ID | Título | Feature Ref | Esfuerzo | Estado |
|---|---|---|---|---|
| B-009 | Session timeout por inactividad (15 min) | EP-10 | 5 | ✅ Done |
| B-010 | Bloqueo de IP tras intentos fallidos (5 intentos, 5 min) | EP-10 | 5 | ✅ Done |

---

## 📊 Resumen de Brechas del README

Según el gap analysis (`scrum/releases/GAP_ANALYSIS.md`), de las ~30 features del README:

| Estado | Cantidad |
|---|---|
| ✅ Implementado | 17 |
| ⚠️ Parcial | 3 |
| ❌ No implementado | 10 |
| **Total** | **30** |

## 📊 Sprint Metrics (2026-05-04)

| Métrica | Valor |
|---|---|
| Sprints completados | 30 |
| Bugs corregidos (Sprint 29-30) | 10 (B-001 a B-010) |
| Push a GitHub | ✅ Último commit: `137640e` B-008 Results persistence |
| Build | ✅ Compila sin errores |

> Próximo sprint: Sprint 31 — Pendiente definir basado en backlog técnico.

Las 10 brechas están distribuidas en los Sprints 7-10 arriba.
