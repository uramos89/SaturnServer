# Sprint 31 — Test Plan (Funcionalidad Manual + Automatizada)

## Alcance
Pruebas de funcionalidad sobre el servidor de producción .134:3000
Ejecutor: Manual desde navegador + Playwright automatizado

---

## 📋 Casos de Prueba

### US-001: Path Traversal Validation

| # | Paso | Resultado esperado |
|---|---|---|
| 1.1 | Navegar a ContextP Memory → hacer clic en un archivo del árbol | El contenido del archivo se muestra en el panel derecho |
| 1.2 | Hacer GET a `/api/contextp/read?path=../../etc/passwd` | HTTP 400 con `{success: false, error: "Invalid path", code: "INVALID_PATH"}` |
| 1.3 | Hacer GET a `/api/contextp/read?path=%2e%2e%2fetc%2fpasswd` | HTTP 400 con `INVALID_PATH` |
| 1.4 | Hacer GET a `/api/contextp/read?path=file:///etc/passwd` | HTTP 400 con `INVALID_PATH` |
| 1.5 | Hacer GET a `/api/contextp/read?path=/proc/self/environ` | HTTP 400 con `INVALID_PATH` |
| 1.6 | Hacer GET a `/api/contextp/read?path=SKILLS/backup/skill.yaml` | HTTP 200 con contenido del skill |

### US-002: Destructive Incident Filter

| # | Paso | Resultado esperado |
|---|---|---|
| 2.1 | POST `/api/neural/rca` con `incident.title = "delete_server"` | HTTP 400 con `DESTRUCTIVE_DOMAIN` |
| 2.2 | POST `/api/neural/rca` con `incident.title = "shutdown"` | HTTP 400 con `DESTRUCTIVE_DOMAIN` |
| 2.3 | POST `/api/neural/rca` con `incident.title = "format_disk"` | HTTP 400 con `DESTRUCTIVE_DOMAIN` |
| 2.4 | POST `/api/neural/rca` con `incident.description = "run rm -rf /"` | HTTP 400 con `DESTRUCTIVE_DOMAIN` |
| 2.5 | POST `/api/neural/rca` con `incident.title = "cpu.process.high"` | HTTP 200 con análisis RCA normal |

### US-003: Server-Side User Validation

| # | Paso | Resultado esperado |
|---|---|---|
| 3.1 | Hacer login normal con admin/admin12345 | Dashboard se muestra correctamente |
| 3.2 | Abrir DevTools → Application → localStorage → cambiar `saturn-user` a `{"username":"hacker","role":"superadmin"}` | Recargar página → redirige a login (token inválido) |
| 3.3 | Devolver `saturn-token` a vacío y recargar | Debe mostrar pantalla de login |
| 3.4 | Login nuevamente con credenciales correctas | Dashboard funcional de nuevo |

### US-004: Empty State SSH Instructions

| # | Paso | Resultado esperado |
|---|---|---|
| 4.1 | Navegar a Managed Nodes sin servidores conectados | Mostrar "No servers connected" con instrucciones y comando docker-compose |
| 4.2 | Verificar que el botón "Connect Server" está visible | Botón naranja funcional |
| 4.3 | Click en "Connect Server" | Modal se abre con campos Host, Port, Username, Password, Private Key |

### B-011: Identity Vault

| # | Paso | Resultado esperado |
|---|---|---|
| 5.1 | Navegar a Identity Vault | Mostrar header "Identity Vault" + "Multi-Cloud Credential Management" |
| 5.2 | Verificar que NO hay ErrorBoundary | No debe mostrar "INTERFACE COMPONENT ERROR" |
| 5.3 | Click "Import Credential" | Modal con campos Name, Provider, Access Key, Secret Key |
| 5.4 | Llenar formulario con datos de prueba y guardar | Tarjeta de credencial aparece con botones Scan/Delete |
| 5.5 | Importar segunda credencial de otro provider | Múltiples tarjetas visibles simultáneamente |
| 5.6 | Click Delete en una credencial | Confirmación → credencial eliminada → tarjeta desaparece |

---

## 🧪 Pruebas Automatizadas (Playwright)

```bash
# Test de Vault (crear, ver, eliminar credenciales)
node tests/e2e/vault-test.mjs

# Test full E2E
node tests/e2e/e2e-full-audit.mjs
```

---

## Checklist de Verificación

- [ ] US-001: Path traversal rechazado (4 variantes)
- [ ] US-002: Incidentes destructivos rechazados (4 variantes)
- [ ] US-003: Token inválido → login, token válido → dashboard
- [ ] US-004: Empty state con instrucciones visibles
- [ ] B-011: Vault sin ErrorBoundary
- [ ] Build compila (`npm run build`)
- [ ] Deploy a producción
- [ ] Push a GitHub
