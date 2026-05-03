# 🏗️ SDLC — Fase 2: Diseño
## Sprint 15: Motor Local + Fail-Over

---

## 1. Arquitectura de Proveedores Duales

```
┌─────────────────────── LLM SERVICE ───────────────────────┐
│                                                           │
│  ┌─────────────────┐         ┌────────────────────────┐  │
│  │  LOCAL PROVIDER  │         │    CLOUD PROVIDER      │  │
│  │  (Ollama/Qwen)   │         │  (OpenAI/Gemini/etc.)  │  │
│  │                  │         │                        │  │
│  │  Siempre activo  │         │  Opcional, configurable│  │
│  │  $0 por llamada  │         │  $ por llamada         │  │
│  │  100% disponib.  │         │  Depende de red/API    │  │
│  │  ~13s respuesta  │         │  ~1-3s respuesta       │  │
│  └────────┬─────────┘         └───────────┬────────────┘  │
│           │                               │              │
│           └───────────┬───────────────────┘              │
│                       ▼                                  │
│           ┌───────────────────────┐                      │
│           │    ROUTER (routeTask) │                      │
│           │                       │                      │
│           │  basic → local        │                      │
│           │  complex → cloud      │                      │
│           │  cloud fail → local   │                      │
│           │  over budget → local   │                      │
│           └───────────────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

## 2. Flujo de Fail-Over

```
getLLMResponse("auto", prompt, "complex")
  │
  ├─ routeTask("complex")
  │   ├─ ¿cloud disponible? → SÍ → intentar cloud
  │   │   ├─ Éxito → devolver respuesta
  │   │   ├─ Error → markCloudFailed() + cooldown 1min
  │   │   └─ Fallback → local model
  │   │
  │   └─ ¿cloud no disponible? → local model directo
  │       ├─ cooldown activo
  │       ├─ over token budget
  │       └─ sin API key configurada
  │
  └─ routeTask("basic") → local model SIEMPRE
```

## 3. Archivos Modificados

| Archivo | Cambio |
|---|---|
| `install.sh` | +164 líneas: 3 modos selección, detección RAM, guardado .env |
| `src/services/llm-service.ts` | +routeTask(), markCloudFailed(), initDualProviders(), getLocalModelStatus() |
| `src/lib/ares-worker.ts` | Llamadas a getLLMResponse con complexity="complex" |
| `server.ts` | initDualProviders() en startup |
| `src/routes/neural.ts` | GET /api/neural/local-status |

## 4. Tabla de Decisión (routeTask)

| Scenario | basic | complex |
|---|---|---|
| Local sí, Cloud sí, Cloud OK | Local | Cloud |
| Local sí, Cloud sí, Cloud fail | Local | Local (fail-over) |
| Local sí, Cloud no | Local | Local |
| Local no, Cloud sí | ❌ Error | Cloud |
| Local no, Cloud no | ❌ Error | ❌ Error |
