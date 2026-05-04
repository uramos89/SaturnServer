# 🧪 SDLC — Pruebas
## sprint-23-e2e-validation

## Pruebas

| Test | Descripción | Resultado |
|---|---|---|
| Playwright: Login | Login flow funciona | ✅ |
| Playwright: Dashboard | Stats + sidebar cargan | ✅ |
| Playwright: Server detail | Telemetría + comandos | ✅ |
| SSRF: metadata AWS | 169.254.169.254 → 400 | ✅ |
| SSRF: metadata GCP | metadata.google.internal → 400 | ✅ |
| SSRF: private IP | 10.x.x.x → 200 | ✅ |
| SSRF: loopback hex | 0x7f000001 → 400 | ✅ |
| Test lab SSH | 4 contenedores conectables | ✅ |
| DB state | 1 server, 2 skills, 23 audit, 7 ContextP | ✅ |

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
