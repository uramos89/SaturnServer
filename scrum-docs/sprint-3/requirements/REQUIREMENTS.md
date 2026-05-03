# 📋 SDLC — Requisitos
## sprint-3

## Requisitos Funcionales

- | Métrica | Valor |
- |---|---|
- | Total US planificadas | 5 |
- | Completadas | 5 |
- | Item | US ID | Tipo | Prioridad | Esfuerzo | Estado | Notas |
- |---|---|---|---|---|---|---|
- | Notificaciones en actividades fallidas | US-022 | Feature | 🟡 Media | 3 | ✅ Done | `sendNotification()` integrado en ARES Worker cuando status='failed' |
- | Webhook configurable | US-024 | Feature | 🟡 Media | 5 | ✅ Done | UI en Settings + POST/DELETE endpoints |
- | DELETE /api/notifications/:id | US-024b | Feature | 🟡 Media | 1 | ✅ Done | Eliminar webhooks desde la UI |
- | Fix placeholder GET /api/notifications | TECH-002 | Fix | 🔥 Alta | 1 | ✅ Done | `res.json([])` removido, ahora lee de DB real |
- | Servicio de notificaciones modular | TECH-003 | Feature | 🟡 Media | 3 | ✅ Done | `src/services/notification-service.ts` |
- | Endpoint | Método | Descripción |
- |---|---|---|
- | `/api/notifications/:id` | DELETE | Eliminar configuración de notificación |
- | Bug | Síntoma | Fix |
- |---|---|---|
- | Placeholder `res.json([])` en GET /api/notifications | Siempre retornaba lista vacía | Removida línea 932; ahora usa handler real en línea 1500 |

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
