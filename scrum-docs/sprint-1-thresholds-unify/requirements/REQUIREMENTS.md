# 📋 SDLC — Requisitos
## sprint-1-thresholds-unify

## Requisitos Funcionales

- - `checkThresholds()` duplica lógica de `threshold-engine.ts` y falla silenciosamente por columna incorrecta
- - **Acción**: Eliminar el método y su llamado en `processCycle()`
- - Actualmente solo usa `critical` → ignorar la advertencia
- - **Acción**: Leer `warning` Y `critical` de `threshold_configs`, crear incidentes con severidad adecuada
- - Mantener cooldown existente (in-memory + DB)
- - **Acción**: Importar `sendNotification` desde `notification-service.ts`
- - Llamar en cada breach con severidad correcta
- - Servidor corriendo, thresholds configurados, métricas altas → incidente + notificación

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
