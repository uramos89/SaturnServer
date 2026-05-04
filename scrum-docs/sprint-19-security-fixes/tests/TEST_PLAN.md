# 🧪 SDLC — Pruebas
## sprint-19-security-fixes

## Fuzz Test Coverage

| Vector | Casos | Resultado |
|---|---|---|
| SQLi | 20+ payloads (`' OR 1=1--`, `'; DROP TABLE--`, etc.) | ✅ No 500 |
| XSS | 15+ payloads (`<script>alert(1)</script>`, etc.) | ✅ No reflejo |
| Path traversal | 10+ payloads (`../../../etc/passwd`, URL encoded) | ✅ Rechazado |
| Null bytes | 5+ casos (`\0`, `%00`) | ✅ Manejado |
| Arrays | 5+ casos (`[object Object]`, nested) | ✅ Manejado |
| Large bodies | 5+ casos (>1MB) | ✅ Limitado |
| Malformed headers | 5+ casos (Content-Type inválido) | ✅ Manejado |

## STRIDE Verification
- 6 módulos auditados
- 17 amenazas documentadas
- Cada amenaza tiene mitigación implementada

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
