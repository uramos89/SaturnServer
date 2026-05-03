# Sprint 2: Telegram + Pipeline de Notificaciones

## US-01: Fix Telegram cmdRun import path
- `src/services/telegram-service.ts:355` importa `./ssh-agent.js` (no existe)
- Cambiar a `../lib/ssh-agent.js`

## US-02: Fix sendNotification wrapper en server.ts
- `server.ts` `sendNotification()` pasa parámetros en orden incorrecto al servicio modular
- Asegurar que `(db, event, title, message, severity, metadata)` coincida con la firma
