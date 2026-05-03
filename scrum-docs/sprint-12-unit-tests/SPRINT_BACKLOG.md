# 🏃 Sprint 12: Unit Tests

> **Feature Reference:** Tech Debt TD-003 (Tests automatizados)
> **Estado:** ✅ COMPLETADO (11 archivos, 100 tests, 0 fallos)

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: threshold-engine tests
**Como** desarrollador,
**Quiero** tests unitarios para el threshold-engine,
**Para** garantizar que las evaluaciones de umbral son correctas.

**Criterios de Aceptación:**
- **Dado** thresholds configurados con warning y critical, **cuando** se ejecuta `evaluateThresholds()` con métricas normales, **entonces** no se dispara ninguna alerta
- **Dado** thresholds configurados, **cuando** se ejecuta con métricas que superan el warning, **entonces** se dispara alerta de severidad warning
- **Dado** thresholds configurados, **cuando** se ejecuta con métricas que superan el critical, **entonces** se dispara alerta de severidad critical
- **Dado** un cooldown activo, **cuando** se evaluan thresholds repetidamente, **entonces** no se disparan alertas duplicadas dentro del cooldown

### US-002: notification-service tests
**Como** desarrollador,
**Quiero** tests para el servicio de notificaciones,
**Para** garantizar que las alertas llegan a los canales correctos.

**Criterios de Aceptación:**
- **Dado** una configuración webhook activa, **cuando** se envía una notificación, **entonces** el webhook recibe el payload correcto
- **Dado** configuraciones vacías, **cuando** se envía una notificación, **entonces** devuelve resultado vacío sin errores
- **Dado** un canal configurado que falla, **cuando** se envía la notificación, **entonces** los demás canales no se ven afectados y el error se registra

### US-003: ssh-agent tests
**Como** desarrollador,
**Quiero** tests para el agente SSH,
**Para** garantizar que las conexiones y ejecución de comandos funcionan correctamente.

**Criterios de Aceptación:**
- **Dado** una conexión SSH válida, **cuando** se ejecuta `getSystemMetrics()`, **entonces** devuelve CPU, RAM, Disk, uptime, hostname y kernel
- **Dado** una conexión SSH válida, **cuando** se ejecuta `execCommand()`, **entonces** devuelve stdout, stderr y exit code
- **Dado** una conexión activa, **cuando** se ejecuta `disconnect()`, **entonces** la conexión se cierra y se limpian los recursos

### US-004: telegram-service tests
**Como** desarrollador,
**Quiero** tests para el servicio de Telegram,
**Para** garantizar que los comandos y flujos conversacionales funcionan.

**Criterios de Aceptación:**
- **Dado** un mensaje con comando `/status`, **cuando** se procesa, **entonces** el router identifica el comando y ejecuta la acción correspondiente
- **Dado** un mensaje de texto libre, **cuando** se procesa estando en estado `idle`, **entonces** se interpreta con lenguaje natural
- **Dado** un mensaje en medio de un flujo multi-turno, **cuando** se procesa, **entonces** la máquina de estados transiciona correctamente
- **Dado** una respuesta con notificación formateada, **cuando** se genera, **entonces** el formato es correcto para Telegram (Markdown/HTML)
