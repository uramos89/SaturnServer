# 🏗️ SDLC — Diseño
## sprint-19-security-fixes

## Contexto
Realizar DAST/Fuzz testing automatizado y documentar threat model STRIDE para el sistema completo.

## Threat Model STRIDE

| Módulo | Spoofing | Tampering | Repudiation | Info Disclosure | DoS | Elevation |
|---|---|---|---|---|---|---|
| Auth | ❌ Sin MFA | ✅ | ✅ JWT audit | ✅ | ✅ Rate limit | ✅ Role check |
| SSH | ✅ Key check | ✅ | ✅ Logging | ✅ | ✅ Timeout | ✅ |
| AI/Gemini | ✅ API key | N/A | ✅ Prompt log | ✅ | ✅ Budget | ✅ |
| Skills | ✅ Auth | ✅ Validation | ✅ Audit | ✅ | ✅ Timeout | ✅ |
| Notifications | ✅ Webhook secret | N/A | ✅ Sent log | N/A | ✅ | N/A |
| Frontend | ✅ JWT | N/A | N/A | ✅ CSP | ✅ | ✅ RBAC |

## Arquitectura de Fuzz Testing
```
Fuzz Runner
 ├─ SQLi payloads (20+)
 ├─ XSS payloads (15+)
 ├─ Path traversal (10+)
 ├─ Null bytes / arrays / large bodies
 └─ Malformed headers
      ↓
 API Endpoints (auth, servers, skills, etc.)
      ↓
 Assert: No 500 errors, no stack traces exposed
```

## Archivos involucrados
- `tests/fuzz/` — Scripts de fuzzing
- `docs/threat-model-stride.md` — Documentación STRIDE
- Middleware de validación — Mejoras post-fuzz
