# Sprint 1: Unificar Sistema de Thresholds

## Contexto
Dos sistemas compitiendo: `ares-worker.ts:checkThresholds()` y `threshold-engine.ts:evaluateThresholds()`. 
El primero está roto (columna `created_at` no existe), el segundo no notifica. 
Resultado: incidentes mudos, notificaciones jamás enviadas.

## US-01: Remover checkThresholds() de ares-worker
- `checkThresholds()` duplica lógica de `threshold-engine.ts` y falla silenciosamente por columna incorrecta
- **Acción**: Eliminar el método y su llamado en `processCycle()`

## US-02: Expandir threshold-engine con tiering warning/critical
- Actualmente solo usa `critical` → ignorar la advertencia
- **Acción**: Leer `warning` Y `critical` de `threshold_configs`, crear incidentes con severidad adecuada
- Mantener cooldown existente (in-memory + DB)

## US-03: Integrar notificaciones en threshold-engine
- **Acción**: Importar `sendNotification` desde `notification-service.ts`
- Llamar en cada breach con severidad correcta

## US-04: Verificación
- Servidor corriendo, thresholds configurados, métricas altas → incidente + notificación

## Criterios de Aceptación

### US-001: Thresholds unificados
**Dado** dos sistemas de thresholds compitiendo, **cuando** se evalúa una métrica, **entonces** solo un sistema procesa la alerta (sin duplicados).
### US-002: evaluateThresholds funcional
**Dado** `evaluateThresholds()` con métricas que superan el umbral, **cuando** se ejecuta, **entonces** notifica y crea incidente.
