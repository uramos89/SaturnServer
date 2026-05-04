# 🏗️ SDLC — Diseño
## sprint-20-techdebt

## Contexto
Unificar formato de errores en toda la API y añadir SSE como alternativa ligera a Socket.io.

## Error Handling Unificado
```
// api-error.ts
throwApiError(400, "Invalid input", "VALIDATION_ERROR")
handleApiError(res, error)

// Formato estandarizado:
{ "error": "mensaje", "code": "ERROR_CODE" }

// Códigos definidos:
VALIDATION_ERROR, NOT_FOUND, AUTH_ERROR, TOKEN_EXPIRED, 
INVALID_CREDENTIALS, CONFLICT, RATE_LIMIT, INTERNAL_ERROR
```

## SSE Stream
```
GET /api/metrics/stream
  └─ Headers: Content-Type: text/event-stream, Cache-Control: no-cache
  
event: connected
data: {"status":"connected"}

event: metrics  
data: {"servers":3,"cpu":45.2,"memory":67.8}

event: keepalive
data: {"timestamp":"..."}
```

## Archivos involucrados
- `src/lib/api-error.ts` — throwApiError + handleApiError
- `src/routes/metrics.ts` — SSE endpoint
- `src/middleware/error-handler.ts` — Catch-all error middleware
- `src/hooks/useSSE.ts` — Hook frontend para SSE
