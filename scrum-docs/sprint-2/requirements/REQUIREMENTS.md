# 📋 SDLC — Requisitos
## sprint-2

## Requisitos Funcionales

- | Métrica | Valor |
- |---|---|
- | Total US planificadas | 6 |
- | Completadas | 6 |
- | Features entregadas | 3 |
- | Item | US ID | Tipo | Prioridad | Esfuerzo | Estado | Notas |
- |---|---|---|---|---|---|---|
- | Proactive Executor en ARES Worker | US-018 | Feature | 🔥 Alta | 8 | ✅ Done | `processProactiveActivities()` + `evaluateAndRun()` |
- | Evaluación de condiciones (cpu, disk, memory) | US-019 | Feature | 🔥 Alta | 5 | ✅ Done | `evaluateCondition()` con operadores >, <, >=, <=, == |
- | Historial de ejecuciones | US-020 | Feature | 🟡 Media | 3 | ✅ Done | Tabla `proactive_execution_history` + endpoint GET /api/proactive/history |
- | Pause/Resume actividad | US-021 | Feature | 🟡 Media | 2 | ✅ Done | PATCH /api/proactive/:id/toggle |
- | Detección automática de incidentes por thresholds | US-023 | Feature | 🔥 Alta | 8 | ✅ Done | `checkThresholds()` crea incidents automáticamente |
- | Endpoint | Método | Descripción |
- |---|---|---|
- | `/api/proactive/history` | GET | Historial de ejecuciones (query: `?limit=50&activityId=xxx`) |
- | `/api/proactive/:id/toggle` | PATCH | Pausar/reanudar una actividad |

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
