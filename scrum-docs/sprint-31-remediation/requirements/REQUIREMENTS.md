# Sprint 31 — Requirements

## US-001: Path traversal validation en audit y ContextP
**ID:** US-001
**Feature Ref:** EP-10 (Security Hardening)
**Esfuerzo:** 2h
**Prioridad:** Alta
**Dependencia:** Ninguna

### Descripción
Los endpoints `/api/audit` y `/api/contextp/files` aceptan el parámetro `path` sin validar contenido peligroso. Aunque no exponen archivos reales, es una mala práctica aceptar payloads de path traversal sin rechazarlos explícitamente.

### Acceptance Criteria (Given/When/Then)
- **Given** una petición GET a `/api/audit?path=../../etc/passwd`, **when** se procesa, **then** devuelve 400 con `{success: false, error: "Invalid path", code: "INVALID_PATH", status: 400}`
- **Given** una petición GET a `/api/contextp/files?path=../`, **when** se procesa, **then** devuelve 400 con código `INVALID_PATH`
- **Given** path traversal URL-encoded (`%2e%2e%2f`, `..%252f`, `file:///etc/passwd`), **when** se procesa, **then** se rechaza igual

## US-002: Filtro de incidentes destructivos en AI
**ID:** US-002
**Feature Ref:** EP-03 (ARES Neural Engine)
**Esfuerzo:** 1h
**Prioridad:** Alta
**Dependencia:** Ninguna

### Descripción
El endpoint `/api/neural/rca` acepta incidentes con dominios destructivos (`delete_server`, `shutdown`, `format_disk`) sin cuestionarlos. Debe rechazar estos dominios antes de procesarlos.

### Acceptance Criteria (Given/When/Then)
- **Given** un incidente con `incident_type: "delete_server"`, **when** se envía a `/api/neural/rca`, **then** devuelve 400 con `{error: "Destructive incident type rejected", code: "DESTRUCTIVE_DOMAIN"}`
- **Given** un incidente con `incident_type: "shutdown"`, **when** se envía, **then** devuelve 400
- **Given** un incidente normal como `cpu.process.high`, **when** se envía, **then** se procesa normalmente
- **Given** un incidente con `description` que contiene `rm -rf`, **when** se envía, **then** se rechaza

## US-003: Validación de estado de UI contra servidor
**ID:** US-003
**Feature Ref:** — (Frontend Security)
**Esfuerzo:** 3h
**Prioridad:** Alta
**Dependencia:** Ninguna

### Descripción
La UI muestra datos del usuario desde `localStorage` sin validar contra el servidor. Si se manipula `saturn-user`, la UI muestra información falsa aunque el servidor rechace peticiones.

### Acceptance Criteria (Given/When/Then)
- **Given** que se modificó `localStorage` con `saturn-user` falso, **when** la app carga, **then** valida el token contra el servidor antes de mostrar datos
- **Given** un token inválido en `localStorage`, **when** la app intenta cargar, **then** redirige a login sin mostrar datos falsos
- **Given** que el servidor responde con usuario válido, **when** la UI se renderiza, **then** muestra los datos reales del servidor

## US-004: Seed data para servidores SSH
**ID:** US-004
**Feature Ref:** — (Infrastructure)
**Esfuerzo:** 4h
**Prioridad:** Baja
**Dependencia:** Docker test-lab

### Descripción
Al iniciar sin servidores conectados, el panel de administración no tiene terminal funcional. Se debe mostrar instrucciones claras o intentar conectar al test-lab Docker.

### Acceptance Criteria (Given/When/Then)
- **Given** una instalación limpia sin servidores, **when** se abre el panel de servidores, **then** muestra instrucciones para conectar
- **Given** el test-lab Docker disponible, **when** el servidor arranca, **then** intenta conectar automáticamente
