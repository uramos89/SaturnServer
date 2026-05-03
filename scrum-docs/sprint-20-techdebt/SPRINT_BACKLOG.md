# 🏃 Sprint 20 — Tech Debt: Error Handling + SSE

**Periodo:** 2026-05-03
**Objetivo:** Unificar formato de errores en API y agregar SSE como alternativa ligera a Socket.io.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001 (TD-004): Error handling consistente
**Como** desarrollador,
**Quiero** que todos los errores API tengan el mismo formato `{ error: "mensaje", code: "ERROR_CODE" }`,
**Para** que el frontend pueda manejarlos de manera predecible.

**Criterios de Aceptación:**
- **Dado** cualquier endpoint, **cuando** devuelve un error, **entonces** el formato es `{ error: "mensaje" }` (no `{ success: false, error: ...}`)
- **Dado** un error de autenticación, **cuando** se devuelve, **entonces** incluye `code: "AUTH_ERROR" | "TOKEN_EXPIRED" | "INVALID_CREDENTIALS"`
- **Dado** un error de validación, **cuando** se devuelve, **entonces** incluye `code: "VALIDATION_ERROR"`
- **Dado** un error interno (500), **cuando** se devuelve, **entonces** no expone stack traces al cliente

### US-002 (TD-005): SSE (Server-Sent Events)
**Como** cliente liviano,
**Quiero** un endpoint SSE para recibir métricas en tiempo real sin Socket.io,
**Para** poder integrar Saturn con herramientas que no soportan WebSocket (curl, scripts, monitores simples).

**Criterios de Aceptación:**
- **Dado** el endpoint `GET /api/metrics/stream`, **cuando** un cliente se conecta, **entonces** recibe eventos SSE con métricas cada 5s
- **Dado** una conexión SSE, **cuando** el servidor actualiza métricas, **entonces** envía `event: metrics` con datos JSON
- **Dado** una conexión SSE, **cuando** se crea un incidente, **entonces** envía `event: incident`
- **Dado** una conexión SSE, **cuando** el cliente se desconecta, **entonces** se limpian los recursos
