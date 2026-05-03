# 📋 SDLC — Requisitos
## sprint-6

## Requisitos Funcionales

- | Métrica | Valor |
- |---|---|
- | Total US planificadas | 5 |
- | Completadas | 5 |
- - **Dado** un servidor Linux conectado, **cuando** se ejecuta la skill `backup_manager` con parámetros `SOURCE`, `DESTINATION` y `RETENTION_DAYS`, **entonces** se crea un backup comprimido en el destino
- - **Dado** la ejecución de backup, **cuando** se especifica `DRY_RUN=true`, **entonces** el script simula la ejecución sin modificar archivos
- - **Dado** un backup existente con antigüedad mayor a `RETENTION_DAYS`, **cuando** se ejecuta la skill, **entonces** los backups antiguos se eliminan automáticamente
- - **Dado** cualquier error durante el backup (permisos, ruta inexistente), **cuando** falla la ejecución, **entonces** se registra el error y se notifica al administrador
- - **Dado** un servidor Linux conectado, **cuando** se ejecuta la skill `process_manager` con `ACTION=list`, **entonces** devuelve la lista de procesos activos
- - **Dado** un servidor Linux conectado, **cuando** se ejecuta con `ACTION=top` y `SORT_BY=cpu`, **entonces** devuelve los 10 procesos con mayor uso de CPU
- - **Dado** un servidor Linux conectado, **cuando** se ejecuta con `ACTION=search` y `TARGET=nginx`, **entonces** devuelve los procesos que coinciden con el criterio
- - **Dado** la skill ejecutada con `ACTION=kill` y `TARGET=PID`, **cuando** el proceso existe, **entonces** lo termina y confirma la acción
- - **Dado** la skill ejecutada con `ACTION=monitor`, **cuando** toma 3 muestras, **entonces** devuelve un reporte de tendencia
- - **Dado** un servidor Linux conectado, **cuando** se ejecuta la skill con `ACTION=list`, **entonces** devuelve el crontab actual
- - **Dado** la skill ejecutada con `ACTION=add`, `SCHEDULE=0 2 * * *` y `COMMAND=/usr/bin/backup.sh`, **cuando** se añade la tarea, **entonces** aparece en el crontab
- - **Dado** una tarea existente, **cuando** se ejecuta con `ACTION=remove` y `LABEL`, **entonces** la tarea se elimina del crontab
- - **Dado** una tarea existente, **cuando** se ejecuta con `ACTION=disable`, **entonces** la tarea se comenta sin eliminar
- - **Dado** cualquier modificación al crontab, **cuando** se completa, **entonces** el cambio persiste después de reconexión SSH
- - **Dado** que el servidor tiene Socket.io activo, **cuando** un cliente se conecta vía WebSocket, **entonces** recibe eventos de métricas periódicos
- - **Dado** un cliente conectado, **cuando** las métricas de un servidor cambian, **entonces** se emite un evento `server-metrics` con los datos actualizados

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
