# 🏃 Sprint 1 — Multi-Provider AI (Completado ✅)

> **Feature:** Desacoplar Saturn de Gemini. Cualquier proveedor OpenAI-compatible funciona desde la UI.
> **Anti-goal:** No volver a hardcodear un provider en el código.

---

## 📋 Items

| Item | Esfuerzo | Estado |
|---|---|---|
| Refactor llm-service: dispatch único sin casos hardcodeados | 5 | ✅ Done |
| 39 proveedores disponibles (36 OpenAI-compatibles + 3 nativos) | 3 | ✅ Done |
| Cualquier provider nuevo = solo config en DB, no código | 3 | ✅ Done |
| verifyMatrix.md: 11 vistas, 5 modales, 34 botones validados | 3 | ✅ Done |
| ContextP SQL: 6 filas, 4 contratos verificados | 1 | ✅ Done |

---

## 📦 Arquitectura Multi-Provider

```
getLLMResponse(provider, prompt)
  │
  ├─ detectFormat(providerId)
  │   ├── "gemini"     → callGemini()
  │   ├── "anthropic"  → callAnthropic()
  │   ├── "ollama"     → callOllama()
  │   └── "openai"     → callOpenAI() ← 36 providers automáticos
  │
  └── resolveActive()
      ├── DB (ai_providers) → encrypted key → decrypt
      └── Env vars (fallback)
```

**36 proveedores OpenAI-compatibles automáticos**: openai, groq, together, fireworks, deepinfra, deepseek, openrouter, perplexity, replicate, nvidia, huggingface, azure, alibaba, zhipu, stepfun, 01ai, minimax, vllm, localai, lmstudio, textgen, kobold, tabbyapi, xai, meta, mistral, cohere, ai21, writer, upstage, sambanova, yandex, custom + 10 más

**Para agregar uno nuevo:** Solo ir a Settings → seleccionar provider → poner API key → Test → Save. Cero código.

## Criterios de Aceptación

### US-001: Multi-Provider AI
**Dado** cualquier proveedor OpenAI-compatible configurado desde la UI, **cuando** ARES necesita una respuesta, **entonces** la obtiene del proveedor activo sin hardcodear.
### US-002: Sin dependencia de Gemini
**Dado** que Gemini no está configurado, **cuando** hay otro proveedor activo, **entonces** ARES funciona sin errores.
