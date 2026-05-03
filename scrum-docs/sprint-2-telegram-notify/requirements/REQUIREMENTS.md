# 📋 SDLC — Requisitos
## sprint-2-telegram-notify

## Requisitos Funcionales

- - `src/services/telegram-service.ts:355` importa `./ssh-agent.js` (no existe)
- - Cambiar a `../lib/ssh-agent.js`
- - `server.ts` `sendNotification()` pasa parámetros en orden incorrecto al servicio modular
- - Asegurar que `(db, event, title, message, severity, metadata)` coincida con la firma

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
