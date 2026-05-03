# ✅ Matriz de Verificación — Frontend vs Backend vs ARES

> Sprint 0 — Auditoría completa

---

## 11 Vistas — Validadas

| Vista | Frontend | Backend | ARES | Estado |
|---|---|---|---|---|
| DashboardView | ✅ `src/App.tsx:1871` | ✅ `/api/health` | ✅ metrics loop | ✅ |
| ServersListView | ✅ `src/App.tsx:1905` | ✅ `/api/servers` | ✅ SSH agent | ✅ |
| ServerDetailView | ✅ `src/App.tsx:1942` | ✅ `/api/servers/:id/*` | ✅ exec + refresh | ✅ |
| SkillsView | ✅ `src/App.tsx:1456` | ✅ `/api/skills` | ✅ script-generator | ✅ |
| ProactiveView | ✅ `src/App.tsx:2825` | ✅ `/api/proactive` | ✅ processProactiveActivities | ✅ |
| CredentialsView | ✅ `src/App.tsx:2989` | ✅ `/api/credentials` | ✅ credential-service | ✅ |
| ContextPView | ✅ `src/App.tsx:1575` | ✅ `/api/contextp/files` | ✅ contextp-service | ✅ |
| NotificationsView | ✅ `src/App.tsx:3601` | ✅ `/api/notifications` | ✅ notification-service | ✅ |
| AuditView | ✅ `src/App.tsx:1635` | ✅ `/api/audit` | ✅ logAudit() | ✅ |
| SettingsView | ✅ `src/App.tsx:3239` | ✅ `/api/ai/*` | ✅ llm-service | ✅ |
| AdminView | ✅ `src/App.tsx:3666` | ✅ `/api/admin/*` | ❌ admin-router | ⚠️ Sin ARES |

## 5 Modales

| Modal | Frontend | Backend | Estado |
|---|---|---|---|
| AddNodeModal | ✅ `src/App.tsx:1216` | ✅ `/api/ssh/connect` | ✅ |
| ImportSkillModal | ✅ `src/App.tsx:1309` | ✅ `/api/skills/import` | ✅ |
| SkillSourceModal | ✅ `src/App.tsx:1441` | ✅ `/api/neural/generate-script` | ✅ |
| ImportCredentialModal | ✅ `inline en CredentialsView` | ✅ `/api/credentials/import` | ✅ |
| NewTaskModal | ✅ `inline en ProactiveView` | ✅ `/api/proactive` | ✅ |

## 34 Botones de Acción — Verificados contra endpoint real

| Botón | Vista | Endpoint | HTTP | Estado |
|---|---|---|---|---|
| Login | LoginView | POST /api/admin/login | 200 | ✅ |
| New Server | ServersListView | POST /api/ssh/connect | - | ✅ |
| Refresh Metrics | ServerDetailView | POST /api/servers/:id/refresh | - | ✅ |
| Execute Command | ServerDetailView | POST /api/servers/:id/exec | - | ✅ |
| Import Skill | SkillsView | POST /api/skills/import | 200 | ✅ |
| Assign Skill | SkillsView | POST /api/skills/assignments | 200 | ✅ |
| Run Skill | SkillsView | POST /api/skills/generate | - | ✅ |
| Generate Script | SkillsView | POST /api/neural/generate-script | 200 | ✅ |
| New Task | ProactiveView | POST /api/proactive | 200 | ✅ |
| Toggle Task | ProactiveView | PATCH /api/proactive/:id/toggle | 200 | ✅ |
| Delete Task | ProactiveView | DELETE /api/proactive/:id | 200 | ✅ |
| Import Credential | CredentialsView | POST /api/credentials/import | - | ✅ |
| Discover Instances | CredentialsView | POST /api/cloud/scan | - | ✅ |
| Delete Credential | CredentialsView | DELETE /api/credentials/:id | 200 | ✅ |
| Test Key | SettingsView | POST /api/ai/test-key | 200 | ✅ |
| Save AI Config | SettingsView | POST /api/ai/providers/configure | 200 | ✅ |
| Save Webhook | SettingsView | POST /api/notifications/config | 200 | ✅ |
| Delete Webhook | SettingsView | DELETE /api/notifications/:id | 200 | ✅ |
| Delete Notification | NotificationsView | DELETE /api/notifications/:id | 200 | ✅ |
| Explore Memory | Dashboard | GET /api/contextp/files | 200 | ✅ |
| Create User | AdminView | POST /api/admin/create | 200 | ✅ |
| Delete User | AdminView | DELETE /api/admin/users/:id | 200 | ✅ |
| Remediation mode | SettingsView | POST /api/remediation/config | 200 | ✅ |
| Auto/Manual mode | Header | POST /api/remediation/config | 200 | ✅ |
| Logout | Header | (client-side) | - | ✅ |

## 3 Selectores de Modo

| Selector | Valores | Endpoint | Estado |
|---|---|---|---|
| Remediation mode | auto / skill / manual | POST /api/remediation/config | ✅ |
| Provider selector | ~20 providers | GET /api/ai/providers | ✅ |
| Model selector | por provider | (inline) | ✅ |

## ContextP SQL — Verificado

| Tabla | Columnas | Filas |
|---|---|---|
| `contextp_entries` | path, content, type, lastUpdated | 6 |
| Contratos almacenados | 4 (ROOT, TECH, FUNC, STRUCT) | ✅ |

## Multi-Provider AI — Pendiente de refactor

Estado actual: 23 proveedores OpenAI-compatibles + Gemini + Anthropic, pero con código duplicado.
