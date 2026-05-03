# 🏃 Sprint 6 — Skills de Sistema (Completado ✅)

> **Feature Reference:** EP-09 (System Management), EP-11 (Health & Backup)
> **Sprint Goal:** Skills de sistema operativo (backup, procesos, cron) listas para usar desde el Proactive Executor

> **Estado:** ✅ COMPLETADO

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Total US planificadas | 5 |
| Completadas | 5 |

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Backup Manager skill
**Como** administrador del sistema,
**Quiero** ejecutar backups remotos vía rsync con retención configurable,
**Para** proteger los datos de los servidores gestionados.

**Criterios de Aceptación:**
- **Dado** un servidor Linux conectado, **cuando** se ejecuta la skill `backup_manager` con parámetros `SOURCE`, `DESTINATION` y `RETENTION_DAYS`, **entonces** se crea un backup comprimido en el destino
- **Dado** la ejecución de backup, **cuando** se especifica `DRY_RUN=true`, **entonces** el script simula la ejecución sin modificar archivos
- **Dado** un backup existente con antigüedad mayor a `RETENTION_DAYS`, **cuando** se ejecuta la skill, **entonces** los backups antiguos se eliminan automáticamente
- **Dado** cualquier error durante el backup (permisos, ruta inexistente), **cuando** falla la ejecución, **entonces** se registra el error y se notifica al administrador

### US-002: Process Manager skill
**Como** administrador,
**Quiero** listar, buscar y monitorear procesos en servidores remotos,
**Para** diagnosticar problemas de rendimiento.

**Criterios de Aceptación:**
- **Dado** un servidor Linux conectado, **cuando** se ejecuta la skill `process_manager` con `ACTION=list`, **entonces** devuelve la lista de procesos activos
- **Dado** un servidor Linux conectado, **cuando** se ejecuta con `ACTION=top` y `SORT_BY=cpu`, **entonces** devuelve los 10 procesos con mayor uso de CPU
- **Dado** un servidor Linux conectado, **cuando** se ejecuta con `ACTION=search` y `TARGET=nginx`, **entonces** devuelve los procesos que coinciden con el criterio
- **Dado** la skill ejecutada con `ACTION=kill` y `TARGET=PID`, **cuando** el proceso existe, **entonces** lo termina y confirma la acción
- **Dado** la skill ejecutada con `ACTION=monitor`, **cuando** toma 3 muestras, **entonces** devuelve un reporte de tendencia

### US-003: Cron Manager skill
**Como** administrador,
**Quiero** gestionar tareas programadas (cron) en servidores remotos,
**Para** automatizar mantenimientos recurrentes.

**Criterios de Aceptación:**
- **Dado** un servidor Linux conectado, **cuando** se ejecuta la skill con `ACTION=list`, **entonces** devuelve el crontab actual
- **Dado** la skill ejecutada con `ACTION=add`, `SCHEDULE=0 2 * * *` y `COMMAND=/usr/bin/backup.sh`, **cuando** se añade la tarea, **entonces** aparece en el crontab
- **Dado** una tarea existente, **cuando** se ejecuta con `ACTION=remove` y `LABEL`, **entonces** la tarea se elimina del crontab
- **Dado** una tarea existente, **cuando** se ejecuta con `ACTION=disable`, **entonces** la tarea se comenta sin eliminar
- **Dado** cualquier modificación al crontab, **cuando** se completa, **entonces** el cambio persiste después de reconexión SSH

### US-004: Live Stream Socket.io (verificación)
**Como** operador del dashboard,
**Quiero** ver métricas en tiempo real vía Socket.io,
**Para** monitorear servidores sin recargar la página.

**Criterios de Aceptación:**
- **Dado** que el servidor tiene Socket.io activo, **cuando** un cliente se conecta vía WebSocket, **entonces** recibe eventos de métricas periódicos
- **Dado** un cliente conectado, **cuando** las métricas de un servidor cambian, **entonces** se emite un evento `server-metrics` con los datos actualizados
- **Dado** un cliente desconectado, **cuando** se pierde la conexión, **entonces** el servidor limpia los recursos asociados

### US-005: Skills importadas y funcionales
**Como** sistema,
**Quiero** que las 5 skills estén registradas en la base de datos,
**Para** que ARES y el Proactive Executor puedan invocarlas.

**Criterios de Aceptación:**
- **Dado** que las skills están instaladas en disco, **cuando** se consulta `GET /api/skills`, **entonces** devuelve las 3 skills (backup, process, cron)
- **Dado** una skill registrada en DB, **cuando** se consulta su detalle, **entonces** incluye `name`, `language`, `version`, `description` y `path`
- **Dado** una skill en DB, **cuando** ARES intenta ejecutarla contra un servidor, **entonces** la skill se resuelve y ejecuta correctamente

---

## 📦 Nuevas Skills disponibles

| Skill | Acciones | Parámetros |
|---|---|---|
| **Backup Manager** | rsync backup + retention cleanup + dry-run | SOURCE, DESTINATION, RETENTION_DAYS, EXCLUDE, DRY_RUN |
| **Process Manager** | list, top (top 10 CPU/mem), search, kill (PID/name), monitor (3 snapshots) | ACTION, TARGET, SORT_BY |
| **Cron Manager** | list crontab, add job, remove by label, enable/disable | ACTION, SCHEDULE, COMMAND, LABEL |

---

## 📁 Archivos nuevos

```
SKILLS/backup_manager/
├── skill.yaml      ← Definición con parámetros y riesgos
└── script.sh       ← Script bash ejecutable

SKILLS/process_manager/
├── skill.yaml
└── script.sh

SKILLS/cron_manager/
├── skill.yaml
└── script.sh
```
