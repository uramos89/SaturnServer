# Sprint 2: Telegram + Pipeline de Notificaciones

## US-01: Fix Telegram cmdRun import path
- `src/services/telegram-service.ts:355` importa `./ssh-agent.js` (no existe)
- Cambiar a `../lib/ssh-agent.js`

## US-02: Fix sendNotification wrapper en server.ts
- `server.ts` `sendNotification()` pasa parámetros en orden incorrecto al servicio modular
- Asegurar que `(db, event, title, message, severity, metadata)` coincida con la firma

## Criterios de Aceptación

### US-001: Telegram cmdRun fix
**Dado** `telegram-service.ts`, **cuando** se ejecuta un comando, **entonces** el import path a `ssh-agent` es correcto.
### US-002: Pipeline notificaciones Telegram
**Dado** un incidente creado, **cuando** se notifica, **entonces** el mensaje llega al chat de Telegram configurado.
