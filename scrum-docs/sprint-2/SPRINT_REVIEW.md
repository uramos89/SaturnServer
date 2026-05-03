# 📋 Sprint Review — Sprint 2

> **Fecha:** 2026-05-03
> **Demo para:** Ulises (PO)

---

## ✅ Entregables del Sprint

### Proactive Executor
- `processProactiveActivities()` en ARES Worker — corre cada 60s
- `evaluateAndRun()` — evalúa schedule, condiciones y ejecuta skills
- `evaluateCondition()` — soporta `cpu`, `memory`, `disk` con operadores `>`, `<`, `>=`, `<=`, `==`
- `isTimeToRun()` — parsea schedules como `5m`, `30m`, `1h`, `2h`
- `getTargetServers()` — resuelve targets por tipo (all, server, group)

### Threshold Detection
- `checkThresholds()` — monitorea métricas contra `threshold_configs`
- Crea incidentes automáticos cuando se superan límites
- Severidad: `critical` si excede 1.5x el threshold, `warning` si no

### Pause/Resume
- `PATCH /api/proactive/:id/toggle` — cambia estado enabled
- Botón "Enabled"/"Paused" en la UI ya funcional

### Execution History
- Tabla `proactive_execution_history` con registro completo
- `GET /api/proactive/history` — historial con filtro opcional por activityId
- Estados: `pending` → `running` → `success`/`failed`/`skipped`/`warning`

### UI
- Botón "History" en la toolbar de Proactive Engine (abre endpoint en nueva pestaña)
- Botón "Test Key" en onboarding + settings (validación de API key)
- Botón "Enabled"/"Paused" con toggle funcional

---

## 🐛 Bugs encontrados y fixeados durante Sprint 2

| Bug | Síntoma | Fix |
|---|---|---|
| N/A | — | Sprint limpio |

---

## ❌ No entregado / Fuera de scope

- [ ] Notificaciones cuando una actividad falle (US-022) → Sprint 3
- [ ] Integración con webhooks reales
