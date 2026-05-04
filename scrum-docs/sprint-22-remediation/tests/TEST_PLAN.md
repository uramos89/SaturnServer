# 🧪 SDLC — Pruebas
## sprint-22-remediation

## Pruebas

| Test | Vector | Resultado esperado | Resultado |
|---|---|---|---|
| P0-001 | NoSQL injection `$gt` | HTTP 400 | ✅ |
| P0-001 | Empty object body | HTTP 400 | ✅ |
| P0-001 | UTF-16 Content-Type | HTTP 400 | ✅ |
| P0-002 | AWS metadata IP | HTTP 400 (SSRF_BLOCKED) | ✅ |
| P0-002 | GCP metadata host | HTTP 400 | ✅ |
| P0-002 | Hex loopback | HTTP 400 | ✅ |
| P0-002 | Decimal loopback | HTTP 400 | ✅ |
| P0-003 | CRLF injection | HTTP 400 | ✅ |
| P0-003 | Malformed Transfer-Encoding | HTTP 400 | ✅ |
| P1-004 | Payload > 1MB | HTTP 413 | ✅ |
| P1-004 | Unicode path traversal | HTTP 400 | ✅ |
| P2-005 | HSTS header | max-age=31536000 | ✅ |
| P2-005 | X-XSS-Protection | 1; mode=block | ✅ |
| P2-005 | Permissions-Policy | restrictiva | ✅ |

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
