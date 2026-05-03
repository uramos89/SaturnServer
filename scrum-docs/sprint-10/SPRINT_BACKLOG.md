# 🏃 Sprint 10 — Frontend & Live Stream (Completado ✅)

> **Feature Reference:** EP-13, EP-05, EP-07

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: ContextP explorer: CONTRACTS visible en árbol
**Como** operador del dashboard,
**Quiero** ver la jerarquía de contratos ContextP en el explorador,
**Para** entender las reglas arquitectónicas activas.

**Criterios de Aceptación:**
- **Dado** el ContextP Explorer en el frontend, **cuando** se expande el árbol, **entonces** se muestran los 5 contratos (ROOT, TECH, FUNC, STRUCT, AUDIT)
- **Dado** un contrato en el árbol, **cuando** se hace clic, **entonces** se muestra su contenido completo
- **Dado** que los contratos están en el filesystem, **cuando** se carga el explorador, **entonces** los contratos se sincronizan desde ContextP/CONTRACTS/

### US-002: POST /api/contextp/sync
**Como** sistema,
**Quiero** sincronizar los archivos ContextP a la base de datos,
**Para** que el frontend pueda consultarlos sin acceso al filesystem.

**Criterios de Aceptación:**
- **Dado** archivos en el directorio ContextP/, **cuando** se invoca `POST /api/contextp/sync`, **entonces** se leen todos los archivos y se insertan/actualizan en `contextp_entries`
- **Dado** archivos modificados en disco, **cuando** se invoca sync, **entonces** las entries en DB se actualizan con el nuevo contenido
- **Dado** el sync completado, **cuando** se consulta `GET /api/contextp/*`, **entonces** devuelve datos desde la DB

### US-003: Tabla contextp_entries poblada
**Como** sistema,
**Quiero** que la tabla contextp_entries tenga al menos 6 entries iniciales,
**Para** que el frontend tenga datos que mostrar desde el primer inicio.

**Criterios de Aceptación:**
- **Dado** un servidor recién iniciado, **cuando** se ejecuta el seed inicial, **entonces** contextp_entries tiene al menos 6 filas
- **Dado** entries en la tabla, **cuando** se consultan, **entonces** cada entry tiene `path`, `content`, `type` y `lastUpdated`

### US-004: Notifications Tab en sidebar
**Como** operador,
**Quiero** una pestaña de Notificaciones en la barra lateral,
**Para** ver y gestionar las configuraciones de notificación sin ir a Settings.

**Criterios de Aceptación:**
- **Dado** el dashboard, **cuando** se carga, **entonces** hay un enlace "Notifications" en la sidebar
- **Dado** el tab de Notificaciones, **cuando** se selecciona, **entonces** muestra las configuraciones actuales (webhook, email, telegram)
- **Dado** el tab de Notificaciones, **cuando** se añade o elimina una configuración, **entonces** la lista se actualiza sin recargar la página

### US-005: Compliance Report endpoint
**Como** operador,
**Quiero** ver el reporte de compliance desde el frontend,
**Para** monitorear el estado regulatorio del sistema.

**Criterios de Aceptación:**
- **Dado** el dashboard, **cuando** se accede a la sección de Compliance, **entonces** se muestra el reporte con métricas de cobertura
- **Dado** el reporte de compliance, **cuando** hay eventos registrados, **entonces** se muestra el conteo por tipo y cobertura regulatoria

### US-006: Live Metrics dashboard ⚠️
**Como** operador,
**Quiero** un dashboard de métricas en vivo con Socket.io,
**Para** monitorear servidores en tiempo real.

**Criterios de Aceptación:**
- **⚠️ Pendiente:** Esta US queda para backlog futuro. Backend de Socket.io implementado y funcional. Falta frontend dedicado.
- **Dado** un servidor conectado, **cuando** Socket.io está activo, **entonces** emite eventos de métricas periódicos
- **Dado** el frontend recibe eventos de métricas, **cuando** se implemente el dashboard, **entonces** mostrará CPU/RAM/Disk en vivo

---

## 📦 Logros

| Feature | Antes | Después |
|---|---|---|
| ContextP tree | SKILLS, PARAMS, IDENTITY, AUDIT | + CONTRACTS |
| contextp_entries | 0 filas | 6 filas sincronizadas |
| Notifications | Solo en Settings | Pestaña propia en sidebar |
| Compliance | Sin metadatos | GDPR/PCI/HIPAA en cada log |
