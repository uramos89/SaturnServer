# 🧪 SDLC — Pruebas
## sprint-20-techdebt

## Pruebas

| Test | Descripción | Resultado |
|---|---|---|
| Error format | Todos los errores usan formato `{ error, code }` | ✅ |
| No mixed format | Ningún endpoint usa `{ success: false, error }` | ✅ |
| Auth errors | Errores de auth incluyen code específico | ✅ |
| Validation errors | Errores de validación incluyen VALIDATION_ERROR | ✅ |
| No stack trace | Errores 500 no exponen stack trace | ✅ |
| SSE connection | GET /api/metrics/stream conecta y recibe eventos | ✅ |
| SSE metrics | Recibe event: metrics cada 5s | ✅ |
| SSE cleanup | Cliente desconectado libera recursos | ✅ |

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
