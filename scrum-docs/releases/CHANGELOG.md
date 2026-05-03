# 📜 Changelog — Saturn Server

> Formato basado en [Keep a Changelog](https://keepachangelog.com/) + [Semantic Versioning](https://semver.org/)

---

## [1.1.0] — 2026-05-03

### Added
- **Multi-Provider AI Architecture** — refactor completo de `llm-service.ts`
  - 39 proveedores disponibles (36 OpenAI-compatibles + Gemini + Anthropic + Moonshot)
  - Agregar nuevo provider = solo config en UI. Cero código.
  - Dispatch único: detectFormat() → call unificado
  - Sin casos hardcodeados en el dispatch principal
- **Verification Matrix** (`scrum/sprint-0/VERIFICATION_MATRIX.md`)
  - 11 vistas validadas vs backend vs ARES
  - 5 modales, ~25 botones, 3 selectores verificados
  - ContextP SQL: 6 filas, 4 contratos

### Changed
- `resolveActive()` unificado: DB → env vars, sin lógica duplicada por provider
- `callOpenAI()` maneja 36 providers con una sola función
- `getDefaultBaseUrl()` registry para URLs por defecto

## [1.0.0] — 2026-05-03

### Added
- **ContextP explorer**: ahora muestra CONTRACTS en el árbol de archivos
- **POST /api/contextp/sync**: sincroniza archivos ContextP a la tabla SQLite
- **Notifications Tab**: pestaña dedicada en sidebar con lista de canales configurados
- **ContextP entries**: 6 filas sincronizadas desde archivos markdown

### Sprint 1-10 completados
- 64 user stories implementadas
- 16 skills operacionales (11 bash + 5 powershell)
- 10 brechas del README cerradas
- JWT global, Telegram conversacional, Compliance GDPR/PCI/HIPAA

## [0.9.0] — 2026-05-03

### Added
- **16 skills total** en DB (11 bash + 5 powershell)
- **Firewall Manager** (iptables/ufw): list, allow, deny, delete, enable, disable
- **Windows Firewall Manager** (powershell): netsh-based rule management
- **SSL/Certbot Manager**: list, obtain, renew, expiry, revoke
- **SSH Hardening**: audit, apply CIS benchmarks, port-rotate, key-only, root-disable
- **SMART Disk Monitor**: health, temperature, errors, reallocated sectors
- **User Manager**: create, delete, lock, unlock, groups
- **Nginx Manager**: create-site, enable, disable, SSL, reload
- **Apache Manager**: virtual hosts, modules, SSL, reload
- **IIS Manager** (powershell): sites, app pools, start/stop/restart
- **Windows Task Scheduler** (powershell): create/list/delete scheduled tasks
- **Robocopy Backup** (powershell): multi-threaded Windows backups
- **Compliance Audit**: metadatos GDPR/PCI/HIPAA en cada audit log
- **GET /api/compliance/report**: reporte con totales, cobertura compliance, eventos recientes
- **TypeScript fix**: tipos AuditLogEntry extendidos (warning, THRESHOLD)

### Changed
- `logAudit()` ahora enriquece cada log con campos _compliance (gdpr, pci, hipaa)
- Backlog reestructurado: 4 sprints planificados (Sprint 7-10) cubriendo las 10 brechas del README

## [0.8.0] — 2026-05-03

### Added
- **Backup Manager skill** — `SKILLS/backup_manager/`
  - rsync-based backup con retention y dry-run
  - Parámetros: SOURCE, DESTINATION, RETENTION_DAYS, EXCLUDE
- **Process Manager skill** — `SKILLS/process_manager/`
  - list, top, search, kill, monitor
  - Ordenamiento por CPU, memoria, PID, nombre
- **Cron Manager skill** — `SKILLS/cron_manager/`
  - list, add, remove, enable, disable
  - Jobs identificados por label SATURN_JOB:
- **5 skills total** en el sistema (2 preinstaladas + 3 nuevas)

## [0.7.0] — 2026-05-03

### Added
- **Telegram Bot Service** (`src/services/telegram-service.ts`)
  - **Flujo conversacional completo**: el bot mantiene estado de conversación (sesiones por chat)
  - **Lenguaje natural**: "muéstrame los incidentes", "cómo están los servidores", "remedia el incidente 3"
  - **Comandos**: /status, /incidents, /servers, /skills, /remediate, /run, /help, /start
  - **Asistente paso a paso**: /run guía al usuario a seleccionar skill → servidor → ejecutar
  - **Botones inline**: respuestas con teclados interactivos para navegación rápida
  - **Callback queries**: manejo de botones presionados
  - **Sesiones con TTL**: expiran a los 10 min de inactividad
  - **Formateo HTML**: emojis, bold, code, italic según severidad
- **Integración Telegram en notification-service.ts** — nuevo canal 'telegram' en el sistema de notificaciones
- **POST /api/telegram/webhook** — recibe mensajes y comandos entrantes
- **POST /api/telegram/set-webhook** — registra webhook del bot en Telegram API
- **POST /api/telegram/test** — envía mensaje de prueba para verificar conectividad
- **Nueva épica EP-14**: Comunicación Reactiva en el Product Backlog
- **Sprint 6**: 6 US planificadas para Telegram + WhatsApp

### Reactivo
- Saturn recibe comandos desde Telegram y responde en el mismo chat
- Flujo conversacional multi-turno con estado preservado
- Lenguaje natural interpretado: patrones regex para comandos coloquiales

### Security
- **JWT Middleware global** — `app.use("/api", auth)` protege TODOS los endpoints `/api/*`
  - 401 sin token, 403 si token inválido/expirado
  - Rutas públicas: `/api/health`, `/api/setup/status`, `/api/setup/import`, `/api/admin/login`
- **authenticateJWT mejorado**: ahora retorna JSON con error en vez de `sendStatus()`

### Fixed
- Eliminado placeholder duplicado de JWT middleware que no funcionaba por estar mal posicionado

## [0.5.0] — 2026-05-03

### Added
- **AWS SSM Command Execution** — `POST /api/cloud/ssm-exec` ejecuta comandos en EC2 sin SSH
  - Bypass de security groups, NAT, y keys SSH
  - Requiere SSM Agent + IAM role en la instancia
- **SSM Instance Discovery** — `POST /api/cloud/ssm-instances` lista instancias con SSM Agent
- **SSM Service modular** (`src/services/ssm-service.ts`)
  - `ssmExecCommand()` con polling de resultado
  - `ssmListInstances()` via DescribeInstanceInformation
- **Bastion Proxy** — `src/services/bastion-service.ts` (existente) con conectividad via ProxyJump

### Changed
- Cloud scan ahora inserta instancias descubiertas directo en tabla `servers`

## [0.4.0] — 2026-05-03

### Added
- **Servicio de notificaciones modular** (`src/services/notification-service.ts`)
  - Multi-canal: webhook + email
  - Integrado en ARES Worker cuando actividades proactivas fallan
  - Envía evento, título, mensaje, severidad y metadata
- **Webhook configurable desde UI**
  - Formulario en Settings → Webhook Notifications
  - Lista de webhooks configurados con botón de eliminar
- **DELETE /api/notifications/:id** — eliminar configuración de notificación
- **Notificaciones automáticas** en actividades proactivas fallidas

### Fixed
- **GET /api/notifications** devolvía `[]` (placeholder) ignorando la DB real. Removido placeholder.
- **Webhook data persistente** — ahora se guarda y recupera correctamente

## [0.3.0] — 2026-05-03

### Added
- **Proactive Executor** en ARES Worker
  - `processProactiveActivities()` corre cada 60s
  - Evalúa schedule (5m, 30m, 1h), condiciones (cpu > 80, disk > 85%), y ejecuta skills
  - Soporta operadores: >, <, >=, <=, ==
  - Resuelve targets por tipo: all, server, group
- **Threshold Detection** automática
  - `checkThresholds()` monitorea métricas contra threshold_configs
  - Crea incidentes con severidad critical/warning
- **Pause/Resume** de actividades proactivas
  - `PATCH /api/proactive/:id/toggle`
  - Botón Enabled/Paused en la UI
- **Execution History**
  - Tabla `proactive_execution_history`
  - `GET /api/proactive/history` con filtro por activityId
  - Estados: pending → running → success/failed/skipped/warning
- **Botón History** en toolbar del Proactive Engine
- Botón **Test Key** en onboarding y settings (validación de API key antes de guardar)

### Fixed
- Toggle de actividades proactivas ahora usa PATCH en vez de POST (evita duplicados)

## [0.2.0] — 2026-05-03

### Added
- Gemini 2.5 Flash como provider de IA activo (gemini-2.0-flash cuota agotada)
- Logging de errores en `/api/neural/generate-script` (antes silencioso)
- Estructura de documentación Scrum (`scrum/`)
- Product Backlog con 27 historias de usuario
- **POST /api/ai/test-key**: endpoint para validar API key de IA sin guardarla
  - Compatible con Google, OpenAI, Anthropic
  - Bypass a la DB, llama al provider directamente
  - Retorna `{ success, message }` o `{ success: false, error }`
- **Botón "Test Key"** en onboarding wizard (paso AI Provider):
  - Al lado del campo de API key
  - Spinner durante la prueba
  - ✅ verde si responde OK
  - ❌ rojo con error real si falla
- **Botón "Test Key"** en Settings → Neural Engine:
  - Misma funcionalidad que en onboarding
  - Validación antes de guardar la configuración

### Added
- Gemini 2.5 Flash como provider de IA activo (gemini-2.0-flash cuota agotada)
- Logging de errores en `/api/neural/generate-script` (antes silencioso)
- Estructura de documentación Scrum (`scrum/`)
- Product Backlog con 27 historias de usuario
- **POST /api/ai/test-key**: endpoint para validar API key de IA sin guardarla
  - Compatible con Google, OpenAI, Anthropic
  - Bypass a la DB, llama al provider directamente
  - Retorna `{ success, message }` o `{ success: false, error }`
- **Botón "Test Key"** en onboarding wizard (paso AI Provider):
  - Al lado del campo de API key
  - Spinner durante la prueba
  - ✅ verde si responde OK
  - ❌ rojo con error real si falla
- **Botón "Test Key"** en Settings → Neural Engine:
  - Misma funcionalidad que en onboarding
  - Validación antes de guardar la configuración

### Fixed
- **Credentials import**: frontend enviaba `credentials: {accessKey, secretKey}`, backend esperaba `content: string`. Cambiado a `content: JSON.stringify(...)` en `src/App.tsx`
- **API key decryption**: `resolveConfig()` en `src/services/llm-service.ts` devolvía la API key encriptada sin desencriptar. Agregada función `decrypt()` y detección de formato `iv:ciphertext`
- Los errores de IA ahora se muestran en la respuesta JSON (`error` field) en vez de tragarse silenciosamente

### Changed
- Modelo de Gemini default: `gemini-2.0-flash` → `gemini-2.5-flash`

### Verified
- Todos los endpoints REST responden 200 con campos correctos
- Skills CRUD funcional (list, import, assign, generate)
- Proactive activities CRUD funcional (add, list, delete)
- Credentials CRUD funcional (import, list, delete)
- Notifications config funcional (add email/webhook)
- ContextP explorer funcional (tree + read)
- Remediation modes funcional (global + per-server)
- AI provider config funcional (configure + test-key)

---

## [0.1.0] — 2026-05-02

### Added
- Lanzamiento inicial del Saturn Server
- Autenticación con JWT
- Dashboard con stats de servidores
- Terminal SSH integrado
- Neural Engine (ARES 1.0.0)
- Skills engine (bash + powershell)
- ContextP file explorer
- Sistema de credenciales encriptado
- Proactive activities CRUD
- Notifications config
- OBPA cycles
- Threshold engine
- Socket service para tiempo real
- Bastion SSH service
