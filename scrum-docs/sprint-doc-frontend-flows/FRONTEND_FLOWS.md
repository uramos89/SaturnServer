# Frontend End-to-End Flows — Saturn Server

> Documentación de todos los flujos de interacción del frontend.
> Archivo: `src/App.tsx` (3,900+ líneas, 11 vistas, 4 modales, 13 server tabs)

---

## 1. Arquitectura General

```
App.tsx
├── LoginView              (sin autenticación)
├── OnboardingWizard       (primer setup, 3 pasos)
├── Sidebar                (navegación principal)
│   ├── dashboard
│   ├── servers
│   ├── skills
│   ├── proactive
│   ├── credentials
│   ├── contextp
│   ├── notifications
│   ├── audit
│   ├── settings
│   └── admin
├── Views (intercambiables por activeTab)
│   ├── DashboardView      (Live Metrics)
│   ├── ServersListView    (lista + AddNodeModal)
│   ├── ServerDetailView   (13 sub-tabs)
│   ├── SkillsView         (+ ImportSkillModal + SkillSourceModal)
│   ├── ProactiveView
│   ├── CredentialsView
│   ├── ContextPView       (+ TreeNode)
│   ├── NotificationsView
│   ├── AuditView
│   ├── SettingsView
│   └── AdminView          (contiene UserManager)
└── useSocket              (WebSocket/Socket.io — tiempo real)
```

---

## 2. Login Flow

### Componente: `LoginView` (línea 73)

```
Usuario ingresa usuario y contraseña
        ↓
  fetch POST /api/admin/login
        ↓
  { success, token, user }
        ↓
  setUser(user) → localStorage.setItem('saturn-user', JSON.stringify(user))
  localStorage.setItem('saturn-token', token)
        ↓
  fetchServers(), fetchIncidents(), fetchAuditLogs(), etc.
        ↓
  Sidebar + DashboardView renderizados
```

**Elementos:**
- Input: username (text)
- Input: password (password con toggle visibility 👁️)
- Botón: "Sign In"
- Botón: "Or import credentials" → `/setup/import`
- Estados: loading (spinner), error (texto rojo)

**Endpoints:**
- `POST /api/admin/login` — pública, rate-limited (5 intentos/min)

---

## 3. Onboarding Wizard

### Componente: `OnboardingWizard` (línea 330)

```
Paso 0: AI Provider Setup
  ├── Selector: provider (OpenAI, Google, Anthropic, etc.)
  ├── Selector: modelo (dinámico según provider)
  ├── Input: API Key
  ├── Input: Endpoint (solo OpenAI-compatibles)
  ├── Botón: "Test Key" → POST /api/ai/test-key
  └── Botón: "Next →"

Paso 1: Notification Config
  ├── Input: SMTP Host / Port / User / Pass / From / To
  ├── Input: Webhook URL
  ├── Botón: "Test" → prueba de notificación
  └── Botón: "Next →"

Paso 2: SSH Connection
  ├── Input: Host / Port / Username / Password / Private Key
  ├── Botón: "Test Connection" → POST /api/servers/connect
  └── Botón: "Complete Setup"

Completado → localStorage.setItem('saturn-setup-done', 'true')
          → fetch inicial data
          → DashboardView
```

---

## 4. Live Metrics Dashboard

### Componente: `DashboardView` (línea 1927)

**Carga inicial:** `servers[]`, `incidents[]`, `sshConnections[]` desde estado global

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ StatCard x4: Total, Online, Incidents, SSH          │
├─────────────────────────────────────────────────────┤
│ Server Selector [s1] [s2] [s3] ← botones inline     │
├─────────────────────────────────────────────────────┤
│ Gauges: CPU % / RAM % / Disk % (animados)           │
│ └── motion.span con key=valor para animar cambio    │
│ └── gaugeBar con width animado                       │
├─────────────────────────────────────────────────────┤
│ AreaChart: CPU Over Time (Recharts)                 │
│ AreaChart: RAM & Disk Over Time (Recharts)          │
├─────────────────────────────────────────────────────┤
│ Server Cards (4) → onClick → setActiveTab('servers')│
│ Incident Cards (5) → onAnalyze / onResolve          │
└─────────────────────────────────────────────────────┘
```

**Flujo Socket.io:**
```
1. useEffect: subscribeToServer(selectedServer.id)
2. Socket recibe 'metrics:update' → handleMetricsUpdate
3. handleMetricsUpdate: setServers + setMetricsBuffer (120 pts)
4. metricsBuffer persiste en localStorage
```

**Elementos interactivos:**
| Elemento | Acción | API | Estado post |
|---|---|---|---|
| Botón servidor | `setDashboardServerId(id)` | — | Re-subscribe Socket.io |
| Server Card | `setSelectedServer(s)` + `setActiveTab('servers')` | — | ServerDetailView |
| Incident Card (Analyze) | `handleAnalyzeIncident(id)` | `POST /api/neural/analyze` | `analyzingIncident = id` |
| Incident Card (Resolve) | `handleResolveIncident(id)` | `POST /api/incidents/:id/resolve` | Incidente cerrado |

---

## 5. Servers List

### Componente: `ServersListView` (línea 2101)

```
Header: "Infrastructure Fleet" + Search + "Add Node" button
  └── Search input → filtra servers por nombre/IP (frontend)
  └── "Add Node" → showAddServer = true → AddNodeModal

Server Cards grid (1-4 columnas responsive)
  └── Cada card muestra:
        ├── Icono estado (🟢 online / 🔴 offline / 🟡 pending)
        ├── Nombre, IP, OS
        ├── CPU / RAM / Disk con colores
        └── onClick → setSelectedServer + setServerDetailTab('summary')
```

### Modales Asociados

#### `AddNodeModal` (línea 1216)
```
Formulario:
  ├── Host (input)
  ├── Port (input, default 22)
  ├── Username (input)
  ├── Password (input type=password)
  └── Private Key (textarea)

Botón "Connect" → POST /api/servers/connect
  ├── { host, port, username, password/privateKey }
  ├── Backend: SSH connect → getSystemMetrics → insert/update DB
  └── Response: { success, hostname, metrics }

On success → onSuccess() → refetch servers list
```

---

## 6. Server Detail View

### Componente: `ServerDetailView` (línea 2138)

**13 sub-tabs:**

| Tab | ID | Carga | API | Elementos |
|---|---|---|---|---|
| **Summary** | `summary` | Pool cada 60s | `POST /api/servers/:id/refresh` | Gauges CPU/RAM/Disk, uptime, OS, kernel |
| **Processes** | `processes` | On mount | `GET /api/admin/servers/:id/processes` | Tabla + acciones (kill) |
| **Network** | `network` | On mount | `GET /api/admin/servers/:id/network` | Tabla conexiones |
| **Firewall** | `firewall` | On mount | `GET /api/admin/servers/:id/firewall` | Tabla reglas |
| **Tasks** | `tasks` | On mount | `GET /api/admin/servers/:id/tasks` | Tabla tareas programadas |
| **Users** | `users` | On mount | `GET /api/admin/servers/:id/users` | Tabla usuarios |
| **Packages** | `packages` | On mount | `GET /api/admin/servers/:id/packages` | Tabla paquetes |
| **Web** | `webserver` | On mount | `GET /api/admin/servers/:id/webserver` | Tabla vhosts |
| **Health** | `health` | On mount | `GET /api/admin/servers/:id/health` | SMART, uptime, health score |
| **SSL** | `ssl` | On mount | `GET /api/admin/servers/:id/ssl` | Certificados, expiración |
| **Thresholds** | `thresholds` | On mount | `GET /api/servers/:id/thresholds` | Sliders CPU/RAM/Disk |
| **Audit** | `audit` | On mount | — | Logs locales del servidor |
| **Terminal** | `terminal` | On mount | — | Comando + output |

### Flujo Summary (default)
```
onMount → useEffect con setInterval(60s)
  └── handleRefreshServer(silent=true)
      └── POST /api/servers/:id/refresh
          └── Backend: SSH getSystemMetrics → UPDATE servers
          └── Response: { cpu, memory, disk, uptime, ... }
          └── setSelectedServer({...selectedServer, ...data.metrics})

Además, Socket.io 'metrics:update' actualiza en tiempo real
```

### Flujo Thresholds
```
Render: 3 sliders (CPU, RAM, Disk) + inputs warning/critical
  └── Carga: GET /api/servers/:id/thresholds → { metric, warning, critical }[]

Botón "Save" → PATCH /api/servers/:id/thresholds
  └── DELETE + INSERT threshold_configs
```

### Flujo Terminal
```
Input: comando bash/powershell
Botón "Execute" → POST /api/servers/:id/exec
  └── Backend: sshAgent.execCommand(key, command)
  └── Response: { stdout, stderr, exitCode }
  └── Render: output en pre/code
```

---

## 7. Skills View

### Componente: `SkillsView` (línea 1456) + `ImportSkillModal` (1309) + `SkillSourceModal` (1441)

```
Header: "🧠 Skills Library" + botón "Import Skill"

Skills Grid:
  └── Cada skill:
        ├── Nombre + lenguaje (bash/powershell badge)
        ├── Descripción
        ├── Botón "View Source" → SkillSourceModal
        ├── Toggle enabled → PATCH /api/skills/:id
        └── Botón "Delete" → DELETE /api/skills/:id

Botón "Import Skill" → ImportSkillModal
  └── file input → POST /api/skills/import
```

**Carga inicial:** `GET /api/skills` → `setSkills(data)`

---

## 8. Proactive Activities View

### Componente: `ProactiveView` (línea 3021)

```
Header: "🤖 Proactive Activities" + botón "New Activity"

Tabla de actividades:
  └── Cada actividad:
        ├── Nombre
        ├── Condición (ej: "cpu > 80")
        ├── Schedule (5m, 30m, 1h)
        ├── Target type (all / server)
        ├── Toggle enabled → PATCH /api/proactive/:id/toggle
        ├── Botón "History" → GET /api/proactive/history
        └── Botón "Delete" → DELETE /api/proactive/:id

Botón "New Activity" → Modal NewTask
  └── Inputs: name, skillId, condition, schedule, targetType, targets
  └── POST /api/proactive → insert en DB
```

---

## 9. Credentials View

### Componente: `CredentialsView` (línea 3185)

```
Header: "🔐 Cloud Credentials" + botón "Add"

Credential Cards:
  └── Cada card:
        ├── Provider badge (AWS / GCP / Azure)
        ├── Nombre
        ├── Metadata (region, etc.)
        ├── Botón "Scan" → POST /api/cloud/scan → descubre instancias
        ├── Botón "Delete" → DELETE /api/credentials/:id
        └── Estado scanning (spinner)
```

**Carga inicial:** `GET /api/credentials` → `setCredentials(data)`

---

## 10. ContextP View

### Componente: `ContextPView` (línea 1575)

```
Panel dividido:
  ├── Izquierda: TreeView (TreeNode recursivo)
  │     └── Navegación por archivos ContextP
  │     └── onClick → GET /api/contextp/read?path=...
  └── Derecha: Contenido del archivo (pre/code con syntax highlight)

Header: "📜 ContextP Memory"
Botón "Sync" → POST /api/contextp/sync → 6 entries a SQLite
```

---

## 11. Notifications View

### Componente: `NotificationsView` (línea 3797)

```
Header: "🔔 Notifications" + botón "Add Notification"

Lista de configuraciones:
  └── Cada config:
        ├── Type (webhook / email / telegram)
        ├── Destination
        ├── Toggle enabled
        └── Botón "Delete" → DELETE /api/notifications/:id

Botón "Add" → Formulario inline:
  └── Select: type (webhook / email / telegram)
  └── Input: destination
  └── Config: botToken/chatId para telegram, host/user/pass para email
  └── POST /api/notifications
```

---

## 12. Audit View

### Componente: `AuditView` (línea 1635)

```
Header: "📋 Audit Log"

Tabla:
  └── Columnas: ID, Type, Event, Detail, Timestamp
  └── 100 logs más recientes
  └── Sin acciones (solo lectura)
```

**Carga:** `GET /api/audit` → `logAudit()`

---

## 13. Settings View

### Componente: `SettingsView` (línea 3435)

```
Secciones:
  ├── ⚙️ AI Provider
  │     ├── Selector provider + modelo
  │     ├── API Key input
  │     ├── Botón "Test Key" → POST /api/ai/test-key
  │     └── Botón "Save" → POST /api/ai/providers/configure
  │
  ├── 🔧 Remediation Mode
  │     ├── Selector: auto / skill / manual
  │     ├── Slider: confidence threshold (0.0 - 1.0)
  │     └── Botón "Save" → POST /api/remediation/config
  │
  ├── 📧 SMTP / Email
  │     ├── Inputs: host, port, user, pass, from, to
  │     └── Botón "Save"
  │
  ├── ☁️ Cloud Credentials (inline)
  │     ├── Selector: provider
  │     ├── Inputs: accessKey, secretKey, region
  │     └── Botón "Save" → POST /api/credentials
  │
  ├── 🤖 Telegram Bot
  │     ├── Input: botToken, chatId
  │     ├── Botón "Set Webhook" → POST /api/telegram/webhook
  │     └── Botón "Test" → sendMessage de prueba
  │
  └── 🧠 Skills (inline)
        ├── Input: skillId
        └── Botón "Import" → POST /api/skills/import
```

---

## 14. Admin View

### Componente: `AdminView` (línea 3862) → `<UserManager />` (línea 163)

```
Header: "👥 User Management"
  ├── Tabla usuarios: ID, Username, Role, Created
  ├── Botón "Create User" → showCreate = true
  │     └── Inputs: username, password
  │     └── Botón "Create" → POST /api/admin/create
  └── Botón "Delete" por fila → DELETE /api/admin/users/:id
```

---

## 15. Socket.io Tiempo Real

### Hook: `useSocket` (línea 1700)

```
Conexión:
  const socket = io(window.location.origin)  ← on mount
        ↓
  socket.on('connect') → console.log('[WS] Connected')
  socket.on('metrics:update', handleMetricsUpdate) → setServers + setMetricsBuffer
  socket.on('incident:new', handleNewIncident) → setIncidents prev → [incident, ...prev]
        ↓
  Retorno: { subscribeToServer, unsubscribeFromServer }
        ↓
  subscribeToServer(id) → socket.emit('subscribe:server', id)
  unsubscribeFromServer(id) → socket.emit('unsubscribe:server', id)
```

---

## 16. Matriz de Estado Global

| Variable | Tipo | Inicial | Actualizado por |
|---|---|---|---|
| `servers` | `ManagedServer[]` | `[]` | `fetchServers()`, `handleMetricsUpdate` |
| `incidents` | `Incident[]` | `[]` | `fetchIncidents()`, `handleNewIncident` |
| `auditLogs` | `AuditLog[]` | `[]` | `fetchAuditLogs()` |
| `notifications` | `NotificationConfig[]` | `[]` | `fetchNotifications()` |
| `aiConfig` | `AIConfig \| null` | `null` | `fetchAIConfig()` |
| `sshConnections` | `SshConnection[]` | `[]` | `fetchSSHConnections()` |
| `skills` | `any[]` | `[]` | `fetchSkills()`, `handleSyncSkills()` |
| `proactiveActivities` | `any[]` | `[]` | `fetchProactiveActivities()` |
| `metricsBuffer` | `Record<string, Array>` | `{}` | `handleMetricsUpdate` (Socket.io) |
| `user` | `UserData \| null` | localStorage | `handleLogin()` |
| `activeTab` | `string` | `'dashboard'` | Sidebar clicks |
| `selectedServer` | `ManagedServer \| null` | `null` | ServerCard clicks |
| `dashboardServerId` | `string \| null` | `null` | Dashboard selector |

---

## 17. Resumen de Rutas API por Vista

| Vista | Endpoints usados |
|---|---|
| **Login** | `POST /api/admin/login` |
| **Setup** | `GET /api/setup/status`, `POST /api/ai/test-key`, `POST /api/ai/providers/configure` |
| **Dashboard** | Socket.io `metrics:update`, `POST /api/neural/analyze`, `POST /api/incidents/:id/resolve` |
| **Servers** | `GET /api/servers`, `POST /api/servers/connect`, `POST /api/servers/:id/refresh`, `GET/POST /api/thresholds/:id` |
| **Server Detail** | `GET /api/admin/servers/:id/{processes,network,firewall,tasks,users,packages,webserver,health,ssl}`, `POST /api/servers/:id/exec` |
| **Skills** | `GET /api/skills`, `POST /api/skills/import`, `POST /api/skills/generate` |
| **Proactive** | `GET/POST/DELETE /api/proactive`, `PATCH /api/proactive/:id/toggle`, `GET /api/proactive/history` |
| **Credentials** | `GET/DELETE /api/credentials`, `POST /api/cloud/scan` |
| **ContextP** | `GET /api/contextp/files`, `GET /api/contextp/read`, `POST /api/contextp/sync` |
| **Notifications** | `GET/POST/DELETE /api/notifications` |
| **Audit** | `GET /api/audit` |
| **Settings** | `POST /api/ai/providers/configure`, `POST /api/remediation/config`, `POST /api/telegram/webhook` |
| **Admin** | `GET/DELETE /api/admin/users`, `POST /api/admin/create` |

---

## 18. Modales y su Ciclo de Vida

| Modal | Gatillo | Contenido | onSubmit | onClose |
|---|---|---|---|---|
| **AddNodeModal** | Botón "Add Node" | Host, Port, User, Pass/Key | `POST /api/servers/connect` → refetch | `setShowAddServer(false)` |
| **ImportSkillModal** | Botón "Import Skill" | File input | `POST /api/skills/import` → refetch | `setShowImport(false)` |
| **SkillSourceModal** | Botón "View Source" | Código YAML de la skill | Ninguno (solo lectura) | `setSelectedSource(null)` |
| **NewTaskModal** | Botón "New Activity" | name, skillId, condition, schedule | `POST /api/proactive` → refetch | `setShowNewTaskModal(false)` |
