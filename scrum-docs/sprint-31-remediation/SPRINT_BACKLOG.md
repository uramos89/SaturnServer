# Sprint 31 — Plan de Remediación Post-Auditoría

**Periodo:** 2026-05-04
**Objetivo:** Corregir hallazgos de la auditoría de seguridad y UX malicioso

---

## 📋 Hallazgos a Remediación

| ID | Hallazgo | Severidad | Causa | Tipo | Estado |
|---|---|---|---|---|---|
| H-001 | Path traversal aceptado (200 OK) en `/api/audit` y `/api/contextp/files` | 🟡 Media | Endpoints aceptan parámetros `path` sin validar contenido | Backend | ✅ Resuelto US-001 |
| H-002 | AI acepta incidentes destructivos (`delete_server`, `shutdown`, `format_disk`) sin cuestionar | 🟡 Media | `/api/neural/rca` no filtra dominios peligrosos | Backend | ✅ Resuelto US-002 |
| H-003 | UI muestra datos falsos tras manipular localStorage ("HACKER", "superadmin") | 🟡 Media | Estado de UI se sincroniza con localStorage sin validar | Frontend | ✅ Resuelto US-003 |
| H-004 | Identity Vault crashea con ErrorBoundary (B-011) | 🔴 Alta | `setCloudCreds(data)` sin `Array.isArray()` | Frontend | ✅ Resuelto hotfix |
| H-005 | Panel Admin sin inputs detectables por test automatizado | ℹ️ Info | Selectores no estándar, falta accesibilidad | Frontend | 📝 Pendiente |
| H-006 | Sin servidores SSH conectados, la terminal del AdminDashboard no es accesible | ℹ️ Info | No hay nodos seed en DB production | Infra | ✅ Resuelto US-004 |

---

## 📦 Items del Sprint

### US-001: Validar path traversal en `/api/audit` y `/api/contextp/files`
**Como** auditor de seguridad,
**Quiero** que los endpoints de auditoría y ContextP rechacen payloads de path traversal,
**Para** evitar acceso a archivos del sistema.

**Criterios de Aceptación:**
- **Dado** una petición GET `/api/audit?path=../../etc/passwd`, **cuando** se procesa, **entonces** devuelve HTTP 400 con `{success: false, error, code: "INVALID_PATH", status: 400}`
- **Dado** una petición GET `/api/contextp/files?path=../`, **cuando** se procesa, **entonces** valida que path no contenga `..`, `%2e%2e`, `file://`, ni `/proc/`
- **Dado** path traversal URL-encoded (`%2e%2e%2f`), **cuando** se decodea, **entonces** se rechaza igual

**Archivos a modificar:** `src/routes/audit.ts`, `src/routes/contextp.ts`

### US-002: Filtrar incidentes destructivos en AI RCA
**Como** administrador del sistema,
**Quiero** que el RCA blocker rechace automáticamente incidentes con dominios destructivos,
**Para** evitar que la IA genere skills que destruyan infraestructura.

**Criterios de Aceptación:**
- **Dado** un incidente con `incident_type` que contiene `delete`, `shutdown`, `format`, `drop`, `rm -rf`, **cuando** se envía a `/api/neural/rca`, **entonces** devuelve HTTP 400 con `{error: "Destructive incident type rejected", code: "DESTRUCTIVE_DOMAIN"}`
- **Dado** un incidente normal como `cpu.process.high`, **cuando** se envía, **entonces** se procesa normalmente
- **Dado** un incidente con `description` que contiene comandos shell peligrosos, **cuando** se envía, **entonces** se rechaza

**Archivos a modificar:** `src/routes/neural.ts`

### US-003: Validar estado de UI contra el servidor
**Como** usuario,
**Quiero** que la UI refleje el estado real del servidor, no datos locales manipulados,
**Para** evitar suplantación visual.

**Criterios de Aceptación:**
- **Dado** que se modifica `localStorage.getItem('saturn-user')` con datos falsos, **cuando** la app se carga, **entonces** valida el token contra `/api/admin/me` o similar antes de mostrar datos del usuario
- **Dado** un token inválido en localStorage, **cuando** la app intenta cargar, **entonces** redirige a login sin mostrar datos falsos en el sidebar

**Archivos a modificar:** `src/App.tsx` (método de inicialización de user state)

### US-004: Seed data para servidores SSH de prueba
**Como** desarrollador,
**Quiero** que al iniciar el servidor sin datos, se pueda conectar a un nodo de prueba,
**Para** verificar la funcionalidad de terminal y administración.

**Criterios de Aceptación:**
- **Dado** una instalación limpia, **cuando** el servidor arranca, **entonces** intenta conectar al test-lab Docker (web01, puerto 2222)
- **Dado** que el test-lab no está disponible, **cuando** se muestra la página de servidores, **entonces** muestra instrucciones para conectar un servidor

**Archivos a modificar:** `src/services/database-seed.ts`, `src/App.tsx`

---

## 📊 Estimación

| US | Esfuerzo | Dependencia | Prioridad |
|---|---|---|---|
| US-001 | 2h | Ninguna | 🟡 Alta |
| US-002 | 1h | Ninguna | 🟡 Alta |
| US-003 | 3h | Ninguna | 🟡 Alta |
| US-004 | 4h | Docker test-lab | 🔵 Baja |

---

## 📐 Diseño Técnico

### US-001: Path traversal validation
```typescript
// middleware o helper function
function validatePath(path: string): boolean {
  if (!path) return true;
  const decoded = decodeURIComponent(path);
  const blocked = ['..', '%2e%2e', 'file:', '/proc/', '/etc/', '/sys/'];
  return !blocked.some(b => decoded.includes(b));
}

// En routes:
if (!validatePath(req.query.path as string)) {
  return res.status(400).json({ 
    success: false, error: "Invalid path", code: "INVALID_PATH", status: 400 
  });
}
```

### US-002: Domain filter
```typescript
const DESTRUCTIVE_DOMAINS = ['delete', 'shutdown', 'format', 'drop', 'rm ', 'wipe', 'destroy'];
function isDestructive(domain: string, description: string): boolean {
  const text = `${domain} ${description}`.toLowerCase();
  return DESTRUCTIVE_DOMAINS.some(d => text.includes(d));
}
```

### US-003: Server-side user validation
```typescript
// En App.tsx, al cargar usuario guardado
const savedUser = localStorage.getItem('saturn-user');
const savedToken = localStorage.getItem('saturn-token');
if (savedUser && savedToken) {
  // Validate token with server
  try {
    const res = await api('/api/admin/me');
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    } else {
      // Token invalid, clear
      localStorage.removeItem('saturn-token');
      localStorage.removeItem('saturn-user');
      setUser(null);
    }
  } catch {
    // Network error, use saved data
    setUser(JSON.parse(savedUser));
  }
}
```

---

## 🧪 Tests

| US | Test | Método |
|---|---|---|
| US-001 | Path traversal payloads | Playwright E2E + pytest directo |
| US-001 | Path traversal URL-encoded | pytest con payloads codificados |
| US-002 | Incidentes destructivos | pytest con 10+ payloads peligrosos |
| US-003 | localStorage manipulado | Playwright: injectar, recargar, verificar login |
| US-004 | Seed data test-lab | Verificar que al iniciar sin datos muestra instrucciones |

---

## Security Gate

Antes de cerrar el sprint:
- [ ] Todos los payloads de path traversal rechazados con 400
- [ ] Todos los incidentes destructivos rechazados
- [ ] UI no muestra datos falsos tras manipular localStorage
- [ ] Build compila sin errores
- [ ] Despliegue a producción
- [ ] Push a GitHub
