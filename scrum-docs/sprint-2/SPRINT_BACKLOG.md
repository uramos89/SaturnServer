# 🏃 Sprint 2 — Backlog

> **Período:** 2026-05-03
> **Objetivo:** Proactive Executor, detección de thresholds y pause/resume
> **Sprint Goal:** ARES Worker ejecuta actividades programadas y detecta incidentes por thresholds

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Total US planificadas | 6 |
| Completadas | 6 |
| Features entregadas | 3 |

---

> **Feature Reference:** EP-05 (Alert Engine), EP-09 (System Management)

## 📋 Items del Sprint

| Item | US ID | Tipo | Prioridad | Esfuerzo | Estado | Notas |
|---|---|---|---|---|---|---|
| Proactive Executor en ARES Worker | US-018 | Feature | 🔥 Alta | 8 | ✅ Done | `processProactiveActivities()` + `evaluateAndRun()` |
| Evaluación de condiciones (cpu, disk, memory) | US-019 | Feature | 🔥 Alta | 5 | ✅ Done | `evaluateCondition()` con operadores >, <, >=, <=, == |
| Historial de ejecuciones | US-020 | Feature | 🟡 Media | 3 | ✅ Done | Tabla `proactive_execution_history` + endpoint GET /api/proactive/history |
| Pause/Resume actividad | US-021 | Feature | 🟡 Media | 2 | ✅ Done | PATCH /api/proactive/:id/toggle |
| Detección automática de incidentes por thresholds | US-023 | Feature | 🔥 Alta | 8 | ✅ Done | `checkThresholds()` crea incidents automáticamente |

---

## 🏗️ Arquitectura implementada

```
ARES Worker (cada 60s)
  ├── processIncidents()           ← Existente
  ├── processProactiveActivities() ← NUEVO
  │   ├── isTimeToRun()           → Evalúa schedule (5m, 30m, 1h)
  │   ├── getTargetServers()      → Resuelve servidores target
  │   ├── getServerMetrics()      → Obtiene métricas stored
  │   ├── evaluateCondition()     → Compara contra threshold
  │   └── Ejecuta skill por SSH   → Si condición se cumple
  └── checkThresholds()           ← NUEVO
      └── Crea incidents si métrica > max o < min
```

## 📦 Nuevos endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/proactive/history` | GET | Historial de ejecuciones (query: `?limit=50&activityId=xxx`) |
| `/api/proactive/:id/toggle` | PATCH | Pausar/reanudar una actividad |

## 📦 Nueva tabla

```sql
proactive_execution_history (
  id, activityId, activityName, serverId,
  condition, conditionMet, status,
  script, output, error, executed_at
)
```
