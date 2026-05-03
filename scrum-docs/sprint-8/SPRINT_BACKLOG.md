# 🏃 Sprint 8 — System & Web Services Skills (Completado ✅)

> **Feature Reference:** EP-09 (System Management), EP-15 (Web Services), EP-11 (Health & Backup)
> **Brechas cerradas:** User/Group mgmt, Nginx, Apache, IIS, Task Scheduler, Robocopy

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Skills creadas | 6 |
| Total skills en DB | 16 |
| Brechas del README cerradas | 6 |

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: User Manager
**Como** administrador,
**Quiero** gestionar usuarios del sistema en servidores remotos,
**Para** administrar accesos sin conexión directa.

**Criterios de Aceptación:**
- **Dado** un servidor Linux, **cuando** se ejecuta la skill con `ACTION=list`, **entonces** devuelve los usuarios del sistema con UID, home y shell
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=create` y `username`, **entonces** crea el usuario y establece el password
- **Dado** un usuario existente, **cuando** se ejecuta con `ACTION=delete` y `username`, **entonces** elimina el usuario y su home directory
- **Dado** un usuario existente, **cuando** se ejecuta con `ACTION=lock`, **entonces** bloquea la cuenta del usuario
- **Dado** un usuario existente, **cuando** se ejecuta con `ACTION=add-group` y `groups`, **entonces** añade el usuario a los grupos indicados

### US-002: Nginx Manager
**Como** administrador,
**Quiero** gestionar sitios web en Nginx,
**Para** desplegar y mantener aplicaciones web.

**Criterios de Aceptación:**
- **Dado** un servidor Linux con Nginx, **cuando** se ejecuta con `ACTION=list`, **entonces** devuelve los sitios configurados
- **Dado** un servidor Linux con Nginx, **cuando** se ejecuta con `ACTION=create-site` y parámetros del dominio, **entonces** crea un virtual host y lo habilita
- **Dado** un sitio existente, **cuando** se ejecuta con `ACTION=enable` o `disable`, **entonces** cambia el estado del sitio
- **Dado** un cambio de configuración, **cuando** se ejecuta con `ACTION=test`, **entonces** verifica la sintaxis antes de aplicar
- **Dado** un cambio válido, **cuando** se ejecuta con `ACTION=reload`, **entonces** recarga Nginx sin interrumpir conexiones activas

### US-003: Apache Manager
**Como** administrador,
**Quiero** gestionar sitios web en Apache,
**Para** administrar servidores web tradicionales.

**Criterios de Aceptación:**
- **Dado** un servidor Linux con Apache, **cuando** se ejecuta con `ACTION=list`, **entonces** devuelve los sitios y módulos activos
- **Dado** un servidor Linux con Apache, **cuando** se ejecuta con `ACTION=create-site`, **entonces** crea un virtual host
- **Dado** un sitio existente, **cuando** se ejecuta con `ACTION=enable/disable`, **entonces** cambia el estado del sitio
- **Dado** un módulo de Apache, **cuando** se ejecuta con `ACTION=modules`, **entonces** lista los módulos cargados

### US-004: IIS Manager
**Como** administrador,
**Quiero** gestionar sitios web en IIS (Windows),
**Para** administrar servidores web Windows.

**Criterios de Aceptación:**
- **Dado** un servidor Windows con IIS, **cuando** se ejecuta con `ACTION=list`, **entonces** devuelve los sitios y su estado
- **Dado** un servidor Windows con IIS, **cuando** se ejecuta con `ACTION=start/stop/restart`, **entonces** cambia el estado de un sitio específico
- **Dado** un servidor Windows con IIS, **cuando** se ejecuta con `ACTION=create-site`, **entonces** crea un nuevo sitio web

### US-005: Windows Task Scheduler
**Como** administrador,
**Quiero** gestionar tareas programadas en Windows,
**Para** automatizar mantenimientos en servidores Windows.

**Criterios de Aceptación:**
- **Dado** un servidor Windows, **cuando** se ejecuta con `ACTION=list`, **entonces** devuelve las tareas programadas activas
- **Dado** un servidor Windows, **cuando** se ejecuta con `ACTION=create`, **entonces** crea una tarea programada
- **Dado** una tarea existente, **cuando** se ejecuta con `ACTION=delete/enable/disable`, **entonces** modifica su estado

### US-006: Robocopy Backup
**Como** administrador,
**Quiero** realizar backups en servidores Windows con robocopy,
**Para** proteger datos en entornos Windows.

**Criterios de Aceptación:**
- **Dado** un servidor Windows, **cuando** se ejecuta la skill con parámetros de origen y destino, **entonces** ejecuta robocopy con mirror
- **Dado** la ejecución de backup, **cuando** se completa, **entonces** los archivos en destino reflejan exactamente el origen
- **Dado** un backup con timestamp, **cuando** se ejecuta, **entonces** se preservan los timestamps de los archivos originales

---

## 📦 Skills disponibles

| Skill | Acciones | OS |
|---|---|---|
| 👤 User Manager | list, create, delete, add-group, remove-group, lock, unlock | Linux |
| 🌐 Nginx Manager | list, create-site, enable, disable, ssl, reload, restart, test | Linux |
| 🌐 Apache Manager | list, create-site, enable, disable, ssl, reload, modules | Linux |
| 🌐 IIS Manager | list, status, start, stop, restart, create-site | Windows |
| ⏰ Windows Task Scheduler | list, create, delete, enable, disable, run | Windows |
| 💾 Robocopy Backup | backup con mirror, multi-thread, timestamped | Windows |
