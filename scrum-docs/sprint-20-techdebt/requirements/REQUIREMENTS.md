# 📋 SDLC — Requisitos
## sprint-20-techdebt

## Requisitos Funcionales

- **Dado** cualquier endpoint, **cuando** devuelve un error, **entonces** el formato es `{ error: "mensaje" }` (no `{ success: false, error: ...}`)
- **Dado** un error de autenticación, **cuando** se devuelve, **entonces** incluye `code: "AUTH_ERROR" | "TOKEN_EXPIRED" | "INVALID_CREDENTIALS"`
- **Dado** un error de validación, **cuando** se devuelve, **entonces** incluye `code: "VALIDATION_ERROR"`
- **Dado** un error interno (500), **cuando** se devuelve, **entonces** no expone stack traces al cliente
- **Dado** el endpoint `GET /api/metrics/stream`, **cuando** un cliente se conecta, **entonces** recibe eventos SSE con métricas cada 5s
- **Dado** una conexión SSE, **cuando** el servidor actualiza métricas, **entonces** envía `event: metrics` con datos JSON
- **Dado** una conexión SSE, **cuando** se crea un incidente, **entonces** envía `event: incident`
- **Dado** una conexión SSE, **cuando** el cliente se desconecta, **entonces** se limpian los recursos

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
