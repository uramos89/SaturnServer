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
