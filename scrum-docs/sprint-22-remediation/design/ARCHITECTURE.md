# 🏗️ SDLC — Diseño
## sprint-22-remediation

## Contexto
Cerrar las 8 brechas de seguridad detectadas en la auditoría industrial (Sprint 21).

## Plan de Remediación
```
P0-001: NoSQL Injection (C-003) + UTF-16 (C-012)
  ├─ express.json() → limit: '1mb'
  ├─ Middleware: typeof validation para strings
  └─ Catch: SyntaxError en JSON.parse

P0-002: SSRF Protection (C-009)
  ├─ validateHost() → blocklist de IPs metadata
  │   ├─ 169.254.169.254 (AWS)
  │   ├─ metadata.google.internal (GCP)
  │   ├─ 0x7f000001 / 2130706433 (hex/decimal loopback)
  │   └─ privadas sin server existente
  └─ Integrado en SSH connect handler

P0-003: Protocol Smuggling (C-010)
  └─ SyntaxError handler → HTTP 400

P1-004: Body limit (C-011) + Unicode path (C-004)
  └─ express.json({ limit: '1mb' }) + URL decode try/catch

P2-005: Security Headers (C-006, C-007, C-008)
  └─ helmet() con HSTS, XSS-Protection, Permissions-Policy
```

## Archivos involucrados
- `src/server.ts` — express.json limit + helmet + error middleware
- `src/routes/servers.ts` — validateHost en SSH connect
- `src/middleware/validation.ts` — typeof validator
- `src/middleware/error-handler.ts` — SyntaxError handler
