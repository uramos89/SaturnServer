# Bug Report: Identity Vault ErrorBoundary Crash

## ID: B-011
## Fecha: 2026-05-04
## Severidad: 🔴 Alta

---

## Síntoma
Al navegar a Identity Vault, el componente crashea con:
```
TypeError: (j || []).map is not a function
```
El ErrorBoundary lo atrapa y todas las vistas siguientes muestran "INTERFACE COMPONENT ERROR".

## Causa Raíz
`CredentialsView.fetchCreds()` en `src/App.tsx:3550` llamaba a `setCloudCreds(data)` sin validar que `data` fuera un array.

Cuando la API `/api/credentials` devolvía un objeto de error (429 rate limit, 401 pre-login, etc.), `data = {error: "Too many requests..."}`, y `setCloudCreds(data)` guardaba el objeto en el estado.

Luego, `(cloudCreds || []).map(c => ...)` — al ser `cloudCreds` un objeto (truthy), `(objeto || [])` devolvía el objeto, y `.map()` en un objeto lanza `TypeError`.

## Fix
```typescript
// ❌ Antes:
setCloudCreds(data);

// ✅ Después:
setCloudCreds(Array.isArray(data) ? data : []);
```

También se actualizó el `rsync deploy` para copiar correctamente:
```bash
# ❌ Antes (copiaba a la raíz, no a src/):
rsync -avz src/App.tsx dist/ saturn:/home/ubuntu/saturn/

# ✅ Después:
rsync -avz dist/ saturn:/home/ubuntu/saturn/dist/
rsync -avz src/App.tsx saturn:/home/ubuntu/saturn/src/App.tsx
```

## Archivos modificados
- `src/App.tsx` — línea 3550: `setCloudCreds(Array.isArray(data) ? data : [])`

## Commit
```
76a6a0e fix: setCloudCreds en CredentialsView sin Array.isArray
```

## Despliegue
- Servidor: `192.168.174.134:3000`
- Build: ✅ Compila sin errores
- PM2: Restart exitoso

## Verificación
- Antes: ErrorBoundary activo en Identity Vault
- Después: Vault carga correctamente con header "Identity Vault", botón "Import Credential", y estado vacío "Decrypting Vault..."

## Lección aprendida
Toda llamada a `set<ArrayState>(data)` debe usar `Array.isArray(data) ? data : []` como safe guard. Hay que auditar todos los fetches locales en subcomponentes (no solo el fetchData principal) que ya fue corregido en el hotfix B-001/B-002.
