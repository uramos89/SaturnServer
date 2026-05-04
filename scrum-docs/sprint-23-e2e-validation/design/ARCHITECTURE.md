# 🏗️ SDLC — Diseño
## sprint-23-e2e-validation

## Contexto
Validar funcionalidad E2E del frontend contra el test lab real, y corregir SSRF over-blocking.

## SSRF Fix
```
Antes: validateHost bloqueaba TODAS las IPs privadas
Después: validateHost solo bloquea metadata/loopback
  ├─ 169.254.169.254 → BLOQUEADO (metadata AWS)
  ├─ metadata.google.internal → BLOQUEADO
  ├─ 10.0.0.1 → PERMITIDO (red privada del test lab)
  └─ 192.168.x.x → PERMITIDO
```

## Flujo E2E
```
Playwright Tests (3/3)
  ├─ Login test
  │   └─ Navegar a /login → ingresar credenciales → dashboard visible
  ├─ Dashboard test
  │   └─ Stats visibles → sidebar navegable → métricas cargan
  └─ Server detail test
      └─ Seleccionar servidor → ver telemetría → comandos SSH

Manual API Validation
  ├─ Login + JWT → crear server → ejecutar skill → ver audit log
  └─ SSRF test: metadata → 400, private IP → 200
```

## Archivos involucrados
- `src/middleware/ssrf.ts` — validateHost modificado
- `tests/e2e/playwright/` — Test suite
- `scripts/create-lab.sh` — Test lab (reutilizado)
