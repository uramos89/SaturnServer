# 🏃 Sprint 3 — Backlog

> **Período:** 2026-05-03
> **Objetivo:** Notificaciones + webhooks + DELETE endpoints
> **Sprint Goal:** Sistema de notificaciones funcional y endpoints consistentes

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Total US planificadas | 5 |
| Completadas | 5 |

---

> **Feature Reference:** EP-05 (Alert Engine)

## 📋 Items del Sprint

| Item | US ID | Tipo | Prioridad | Esfuerzo | Estado | Notas |
|---|---|---|---|---|---|---|
| Notificaciones en actividades fallidas | US-022 | Feature | 🟡 Media | 3 | ✅ Done | `sendNotification()` integrado en ARES Worker cuando status='failed' |
| Webhook configurable | US-024 | Feature | 🟡 Media | 5 | ✅ Done | UI en Settings + POST/DELETE endpoints |
| DELETE /api/notifications/:id | US-024b | Feature | 🟡 Media | 1 | ✅ Done | Eliminar webhooks desde la UI |
| Fix placeholder GET /api/notifications | TECH-002 | Fix | 🔥 Alta | 1 | ✅ Done | `res.json([])` removido, ahora lee de DB real |
| Servicio de notificaciones modular | TECH-003 | Feature | 🟡 Media | 3 | ✅ Done | `src/services/notification-service.ts` |

---

## 📦 Nuevos archivos

```
src/services/notification-service.ts  ← Servicio de notificaciones multi-canal
  - sendNotification(db, event, title, message, severity, metadata)
  - sendWebhook(url, payload)
  - sendEmail(config, to, subject, body)
  - Soporta: webhook, email (nodemailer)
```

## 📦 Nuevos endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/notifications/:id` | DELETE | Eliminar configuración de notificación |

## 📦 Arreglos

| Bug | Síntoma | Fix |
|---|---|---|
| Placeholder `res.json([])` en GET /api/notifications | Siempre retornaba lista vacía | Removida línea 932; ahora usa handler real en línea 1500 |

## Criterios de Aceptación

### US-001: Notificaciones multi-canal
**Dado** una configuración de notificación activa, **cuando** se dispara una alerta, **entonces** el mensaje llega al canal configurado (webhook/email/telegram).
### US-002: Webhooks funcionales
**Dado** una URL de webhook configurada, **cuando** se envía una notificación, **entonces** la URL recibe un POST con el payload de la alerta.
### US-003: DELETE endpoints
**Dado** un recurso existente (servidor, skill, notificación), **cuando** se invoca DELETE, **entonces** el recurso se elimina y responde HTTP 200.
