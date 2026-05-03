# Sprint UT-1: Unit Test Expansion

Expandir cobertura unitaria a todos los módulos del core.

## US-001: contextp-service tests
- getStatus: contracts, índices, métricas
- writeAuditLog: escritura y lectura
- getParams: preferencias, config, constraints
- Edge cases: archivos faltantes, contenido vacío

## US-002: admin-router tests
- createAdminRouter devuelve Router
- Rutas CRUD para usuarios, configuraciones

## US-003: llm-service tests
- initLLMService: inicializa con/sin DB
- getLLMResponse: dispatch por provider (gemini, openai, anthropic)
- Empty/missing provider handling

## US-004: encrypt/decrypt tests (server.ts)
- encrypt → decrypt roundtrip
- Diferentes IVs para mismo texto
- Error en decrypt con datos corruptos
