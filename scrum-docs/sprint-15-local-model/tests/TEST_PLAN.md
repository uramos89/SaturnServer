# 🧪 SDLC — Fase 4: Pruebas
## Sprint 15: Motor Local Qwen + Fail-Over

---

## 1. Pruebas de Rendimiento (Ejecutadas en Producción)

| ID | Prueba | Resultado | Veredicto |
|---|---|---|---|
| PT-001 | qwen2.5-coder:1.5b en prod (3.8GB RAM) — tiempo respuesta | **13s** | ✅ Aceptable para background |
| PT-002 | qwen2.5-coder:1.5b — produce JSON válido | `{analysis, proposal, script}` | ✅ |
| PT-003 | qwen2.5-coder:1.5b — consumo RAM | **98.4MB** | ✅ Excelente |
| PT-004 | qwen2.5-coder:1.5b — entendió CPU 89% como uso, no cores | Sí | ✅ |
| PT-005 | Ollama serve en producción | Puerto 11434 responde | ✅ |
| PT-006 | Ollama instalado vía install.sh (simulado) | v0.22.1 | ✅ |

## 2. Pruebas de Fail-Over

| ID | Prueba | Resultado Esperado | Veredicto |
|---|---|---|---|
| FT-001 | Cloud fail → local (simulado con provider sin key) | Ruta a local | ✅ |
| FT-002 | Cloud timeout 30s → local | Fallback automático | ✅ |
| FT-003 | Cloud 429 rate limit → espera → reintenta → fallback | Cooldown 1min | ✅ |
| FT-004 | Restauración cloud después de cooldown | Vuelve a cloud | ✅ |
| FT-005 | Tarea basic siempre a local | Sin consumo de tokens cloud | ✅ |

## 3. Pruebas de Instalación

| ID | Prueba | Resultado Esperado | Veredicto |
|---|---|---|---|
| IT-001 | Modo Auto con <6GB RAM | Selecciona qwen2.5-coder:1.5b | ✅ |
| IT-002 | Modo Auto con 6-8GB RAM | Selecciona gemma3:4b | ✅ |
| IT-003 | Modo Auto con 8-12GB RAM | Selecciona qwen2.5-coder:7b | ✅ |
| IT-004 | Modo Manual muestra solo opciones viables | Depende de RAM | ✅ |
| IT-005 | Modo Expert con modelo inválido | Advertencia + confirmación | ✅ |
| IT-006 | .env generado con ARES_LLM_PROVIDER, OLLAMA_MODEL, OLLAMA_BASE_URL | 3 variables escritas | ✅ |

## 4. Pruebas de API

| ID | Prueba | Resultado Esperado | Veredicto |
|---|---|---|---|
| AT-001 | GET /api/neural/local-status (autenticado) | JSON con ollama_running, model, ram_usage, status | ✅ |
| AT-002 | GET /api/neural/local-status (sin auth) | 401 | ✅ |
