# Sprint 31 — Design / Architecture

## US-001: Path Traversal Validation

### Contexto
Los endpoints `/api/audit` y `/api/contextp/files` aceptaban payloads de path traversal sin rechazarlos explícitamente. Aunque no exponían archivos, es una mala práctica.

### Solución implementada
Se agregó un helper `isPathSafe()` en `src/routes/contextp.ts`:

```typescript
function isPathSafe(requestedPath: string): boolean {
  if (!requestedPath) return false;
  const decoded = decodeURIComponent(requestedPath);
  const blocked = ["..", "file:", "/proc/", "/etc/", "/sys/", "/dev/", "/root/"];
  return !blocked.some(b => decoded.includes(b));
}
```

### Flujo
```
GET /api/contextp/read?path=../../etc/passwd
  → isPathSafe("../../etc/passwd")
    → decodeURIComponent → "../../etc/passwd"
    → includes("..") → true → return false
  → HTTP 400 { success: false, error: "Invalid path", code: "INVALID_PATH" }
```

### Archivos modificados
- `src/routes/contextp.ts`: Agregado helper + validación en GET /contextp/read

---

## US-002: Destructive Incident Filter

### Contexto
El endpoint `/api/neural/rca` aceptaba cualquier `incident_type` sin filtrar dominios destructivos.

### Solución implementada
Se agregó filtro en `src/routes/neural.ts`:

```typescript
const DESTRUCTIVE_PATTERNS = [
  "delete", "shutdown", "format", "drop ", "rm ", 
  "wipe", "destroy", "truncate", "kill ", "reboot"
];

function isDestructiveIncident(incident: any): boolean {
  const text = `${incident?.title || ""} ${incident?.description || ""}`.toLowerCase();
  return DESTRUCTIVE_PATTERNS.some(p => text.includes(p));
}
```

### Flujo
```
POST /api/neural/rca { incident: { title: "delete_server" } }
  → isDestructiveIncident({ title: "delete_server" })
    → "delete_server".includes("delete") → true
  → HTTP 400 { error: "Destructive incident type rejected", code: "DESTRUCTIVE_DOMAIN" }
```

### Archivos modificados
- `src/routes/neural.ts`: Agregado DESTRUCTIVE_PATTERNS + isDestructiveIncident + validación

---

## US-003: Server-Side User State Validation

### Contexto
La UI mostraba datos del usuario desde localStorage sin validar contra el servidor. Si se manipulaba `saturn-user`, la UI mostraba datos falsos.

### Solución implementada
En `src/App.tsx`:

```typescript
const [user, setUser] = useState<UserData | null>(() => {
  const saved = localStorage.getItem('saturn-user');
  const token = localStorage.getItem('saturn-token');
  if (saved && !token) return null; // No token = no user
  return saved ? JSON.parse(saved) : null;
});

useEffect(() => {
  const validateSession = async () => {
    const token = localStorage.getItem('saturn-token');
    if (!token) return;
    try {
      const res = await fetch('/api/servers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('saturn-token');
        localStorage.removeItem('saturn-user');
        localStorage.removeItem('saturn-refresh-token');
        setUser(null);
      }
    } catch { /* Network error - keep saved state */ }
  };
  validateSession();
}, []);
```

### Flujo
```
App carga → localStorage tiene saturn-user + saturn-token
  → validateSession() → GET /api/servers con token
    → 200 → usuario válido, mantener estado
    → 401/403 → token inválido, limpiar todo, mostrar login
```

### Archivos modificados
- `src/App.tsx`: Validación de token al cargar + initialState condicional

---

## US-004: Empty State SSH Instructions

### Contexto
Sin servidores conectados, el panel de administración no mostraba cómo conectar uno.

### Solución implementada
En `src/components/AdminDashboard.tsx` y `src/App.tsx`:

**AdminDashboard.tsx** — Empty state mejorado con:
- Título: "No servers connected"
- Subtítulo: "Click Connect Server above to add your first node"
- Quick start guide con 3 pasos numerados
- Comando docker-compose para test-lab

**App.tsx** — Dashboard inline:
- "No servers — connect one via Managed Nodes"
- "Connect a server via SSH to enable remote management"

### Archivos modificados
- `src/components/AdminDashboard.tsx`: Empty state con instrucciones
- `src/App.tsx`: Texto informativo en dashboard

---

## B-011 Hotfix: Identity Vault Array.isArray

### Contexto
`CredentialsView.fetchCreds()` llamaba a `setCloudCreds(data)` sin validar que data fuera array. API error response corrompía el estado.

### Fix
```typescript
// línea 3550
setCloudCreds(Array.isArray(data) ? data : []);
```

### Archivos modificados
- `src/App.tsx`: línea 3550
