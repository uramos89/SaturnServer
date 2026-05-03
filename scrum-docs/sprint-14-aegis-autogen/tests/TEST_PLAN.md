# 🧪 SDLC — Fase 4: Pruebas
## Sprint 14: Aegis Auto-Generation Pipeline

---

## 1. Pruebas Unitarias

| ID | Caso de Prueba | Resultado Esperado | Estado |
|---|---|---|---|
| UT-001 | `classifyIncidentDomain("CPU 90% on process node")` | Returns `"cpu.process"` | ✅ |
| UT-002 | `classifyIncidentDomain("Memory leak detected")` | Returns `"memory.process.leak"` | ✅ |
| UT-003 | `classifyIncidentDomain("Disk /dev/sda1 100% full")` | Returns `"disk.fs.mount_full"` | ✅ |
| UT-004 | `classifyIncidentDomain("Network timeout to db")` | Returns `"network.timeout"` | ✅ |
| UT-005 | `classifyIncidentDomain("Unknown error")` | Returns `"unknown.generic"` | ✅ |
| UT-006 | `checkAntiRecurrencia()` — 1ra vez | Returns `{allowed: true, iteration: 1}` | ✅ |
| UT-007 | `checkAntiRecurrencia()` — 4ta vez (excede max) | Returns `{allowed: false}` | ✅ |
| UT-008 | `checkAntiRecurrencia()` — dentro de cooldown | Returns `{allowed: false}` | ✅ |
| UT-009 | `getDeterministicFallback("cpu.generic", "linux")` | Returns script bash no vacío | ✅ |
| UT-010 | `getDeterministicFallback("disk.fs.mount_full", "windows")` | Returns script powershell | ✅ |
| UT-011 | `ScriptValidator.validate("echo hello", "bash")` | Returns `{success: true, errors: []}` | ✅ |
| UT-012 | `ScriptValidator.validate("rm -rf /", "bash")` | Returns `{success: false}` (peligroso) | ✅ |
| UT-013 | `chunkScript(150 líneas)` | Returns 2 chunks con checkpoints | ✅ |
| UT-014 | `tryPromoteSkill()` con <5 ejecuciones | No promueve | ✅ |
| UT-015 | `tryPromoteSkill()` con >80% éxito y ≥5 ejec. | Promueve a `persistent-` | ✅ |
| UT-016 | `storeCache()` + `checkCache()` dentro de TTL | Returns cached entry | ✅ |

## 2. Pruebas de Integración

| ID | Caso de Prueba | Resultado Esperado | Estado |
|---|---|---|---|
| IT-001 | POST /api/neural/feedback con datos válidos | HTTP 200, feedbackId creado | ✅ |
| IT-002 | POST /api/neural/feedback sin skill_id | HTTP 400 | ✅ |
| IT-003 | POST /api/neural/feedback con rating inválido (6) | HTTP 400 | ✅ |
| IT-004 | GET /api/neural/feedback/:skillId | HTTP 200, lista + stats | ✅ |
| IT-005 | Pipeline completo: threshold → fallback → cache | Sin errores críticos | 🔄 |

## 3. Pruebas de Regresión

| ID | Caso de Prueba | Resultado Esperado | Estado |
|---|---|---|---|
| RT-001 | ARES procesa incidente con skill existente | No genera nueva skill | ✅ |
| RT-002 | ARES sin AI provider configurado | Marca "manual review" | ✅ |
| RT-003 | Notificaciones en fallo de actividad proactiva | Llega notificación | ✅ |
| RT-004 | Push a GitHub sin perder historial | Commit exitoso | ✅ |

## 4. Pruebas de Seguridad

| ID | Caso de Prueba | Resultado Esperado | Estado |
|---|---|---|---|
| ST-001 | `detectDangerousCommands("rm -rf /")` | Bloqueado como ERROR | ✅ |
| ST-002 | `detectDangerousCommands("DROP DATABASE")` | Bloqueado como ERROR | ✅ |
| ST-003 | `detectDangerousCommands("chmod -R 777 /")` | Bloqueado como ERROR | ✅ |
| ST-004 | `dryRunRemote()` no modifica el servidor | Salida simulada, sin cambios reales | ✅ |
