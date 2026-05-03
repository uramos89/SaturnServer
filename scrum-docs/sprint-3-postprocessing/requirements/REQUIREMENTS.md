# 📋 SDLC — Requisitos
## sprint-3-postprocessing

## Requisitos Funcionales

- - Servidores descubiertos por cloud scan quedan con status `pending`
- - Agregar intento de conexión SSH automático post-descubrimiento
- - Cuando `/api/skills/generate` ejecuta en modo autónomo, notificar al usuario
- - Usar `sendNotification` con evento `auto_remediation`
- - Audit logs existentes no incluyen `_compliance` en metadata
- - Agregar tags en logs clave (SSH connected, cloud scan, remediation)

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
