# 🏃 Sprint 28 — Frontend Fixes + Server Detail Improvements

**Periodo:** 2026-05-03 — 2026-05-04
**Objetivo:** Corregir bugs visuales y funcionales del frontend, mejorar panel de detalle de servidor con pestaña de configuración, y arreglar la importación de módulos ESM.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Server detail Config tab
**Como** administrador,
**Quiero** una pestaña de Configuración en la vista de detalle del servidor,
**Para** editar username, password, puerto SSH y thresholds CPU/RAM/Disk.

**Criterios de Aceptación:**
- **Dado** la vista de detalle de servidor, **cuando** se hace clic en la pestaña Config, **entonces** muestra campos editables para username, password y puerto SSH
- **Dado** la pestaña Config, **cuando** se abre, **entonces** muestra sliders para thresholds CPU/RAM/Disk (warning y critical)
- **Dado** cambios en configuración, **cuando** se guarda, **entonces** se llama a `PUT /api/servers/:id/config`

### US-002: Delete server button
**Como** administrador,
**Quiero** un botón para eliminar servidores desde el frontend,
**Para** remover nodos que ya no están activos.

**Criterios de Aceptación:**
- **Dado** una tarjeta de servidor, **cuando** se hace hover, **entonces** muestra un botón de eliminar (icono Trash2)
- **Dado** el botón de eliminar, **cuando** se hace clic, **entonces** pide confirmación antes de eliminar
- **Dado** la confirmación, **cuando** se acepta, **entonces** llama a `DELETE /api/servers/:id` con try/catch
- **Dado** un error de API, **cuando** ocurre, **entonces** el servidor se elimina del frontend igualmente

### US-003: Port field orange highlight
**Como** desarrollador,
**Quiero** que el campo de puerto SSH se muestre en color naranja,
**Para** mejorar la visibilidad del puerto como campo importante.

**Criterios de Aceptación:**
- **Dado** el campo Port en la interfaz, **cuando** se renderiza, **entonces** aparece en color naranja

### US-004: Fix encryptCredential import (ESM)
**Como** desarrollador,
**Quiero** corregir el error `require is not defined` en servers.ts,
**Para** que el módulo funcione correctamente con ESM.

**Criterios de Aceptación:**
- **Dado** `src/routes/servers.ts`, **cuando** se carga, **entonces** no lanza `require is not defined`
- **Dado** el fix, **cuando** se ejecuta, **entonces** usa `import` de ESM en lugar de `require()`

### US-005: Fix AddNodeModal port state + password eye toggle
**Como** usuario,
**Quiero** poder ingresar el puerto SSH y ver/ocultar la contraseña en el modal de agregar nodo,
**Para** conectar servidores en puertos no estándar.

**Criterios de Aceptación:**
- **Dado** el modal AddNode, **cuando** se abre, **entonces** incluye un campo Port (default 22)
- **Dado** el campo password, **cuando** se hace clic en el toggle Eye/EyeOff, **entonces** muestra/oculta la contraseña
- **Dado** el puerto ingresado, **cuando** se envía el formulario, **entonces** el payload SSH incluye el puerto

### US-006: Config endpoint PUT
**Como** sistema,
**Quiero** que el endpoint `PUT /api/servers/:id/config` esté desplegado y funcione,
**Para** que la configuración del servidor se pueda actualizar desde la API.

**Criterios de Aceptación:**
- **Dado** el endpoint `PUT /api/servers/:id/config`, **cuando** se envía configuración, **entonces** actualiza SSH y thresholds
- **Dado** cambios de credenciales SSH, **cuando** se actualizan, **entonces** la conexión SSH se desconecta automáticamente

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| US planificadas | 6 |
| US completadas | 6 ✅ |
| Archivos modificados | servers.ts, AddNodeModal.tsx, ServerCard.tsx, ServerDetailView.tsx |
| GitHub | `809670f`, `19a546e`, `2a933e0`, `a8749f5`, `e9d5cdd`, `3f23b52`, `2ba682e` |
