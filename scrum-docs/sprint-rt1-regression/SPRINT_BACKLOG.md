# Sprint RT-1: Regression Tests (End-to-End Flows)

Verificar que flujos completos funcionan de principio a fin.

## US-001: Threshold → Incident → Notification
1. Configurar threshold (POST /api/thresholds/)
2. Ejecutar evaluateThresholds con métricas altas
3. Verificar incidente creado en DB (severidad correcta)
4. Verificar audit_log entry con metadata compliance
5. Verificar sendNotification llamado con payload correcto

## US-002: SSH Poll → Metrics → Threshold → Alert
1. Simular ciclo de polling SSH con métricas
2. Verificar servidor actualizado en DB
3. Verificar thresholds evaluados
4. Verificar notificación enviada

## US-003: Remediation Pipeline
1. POST /api/skills/generate con prompt
2. Verificar validación de script
3. Verificar auto-ejecución si confianza > threshold
4. Verificar notificación de auto-remediation
5. Verificar audit log de ejecución

## US-004: Telegram Multi-Turn
1. handleTelegramUpdate con /status
2. handleTelegramUpdate con /remediate → selección → ejecución
3. Verificar sesión en memoria (idle → awaiting → idle)
4. Verificar callback_query handler

## US-005: JWT Auth Coverage
- Verificar que TODAS las rutas /api/* (excepto PUBLIC_PATHS) requieren token
- Verificar que PUBLIC_PATHS son accesibles sin token
- Verificar que token expirado recibe 401

## US-006: Concurrent Threshold Evaluation
1. Configurar thresholds para 5 servidores
2. Ejecutar evaluateThresholds concurrente
3. Verificar cooldown respetado entre llamadas
4. Verificar sin colisiones UNIQUE en IDs
