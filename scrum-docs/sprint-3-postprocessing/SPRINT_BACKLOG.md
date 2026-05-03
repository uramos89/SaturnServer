# Sprint 3: Post-procesamiento Cloud + Remediation + Compliance

## US-01: Auto-test SSH tras cloud scan
- Servidores descubiertos por cloud scan quedan con status `pending`
- Agregar intento de conexión SSH automático post-descubrimiento

## US-02: Notificación en auto-remediation
- Cuando `/api/skills/generate` ejecuta en modo autónomo, notificar al usuario
- Usar `sendNotification` con evento `auto_remediation`

## US-03: Compliance tags en audit_logs
- Audit logs existentes no incluyen `_compliance` en metadata
- Agregar tags en logs clave (SSH connected, cloud scan, remediation)

## Criterios de Aceptación

### US-001: Auto-test SSH post cloud scan
**Dado** un servidor descubierto por cloud scan con status `pending`, **cuando** se completa el scan, **entonces** se intenta conexión SSH automática.
### US-002: Compliance post-procesamiento
**Dado** un servidor conectado, **cuando** se registra en el sistema, **entonces** se agregan metadatos de compliance.
