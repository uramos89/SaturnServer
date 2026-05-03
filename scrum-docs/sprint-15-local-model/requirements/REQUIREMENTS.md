# 📋 SDLC — Fase 1: Requisitos
## Sprint 15: Motor Local Qwen2.5-Coder + Fail-Over ARES

---

## 1. Requisitos Funcionales

| ID | Descripción | Prioridad | Estado |
|---|---|---|---|
| RF-001 | Instalación automática de Ollama en install.sh | 🔥 Alta | ✅ |
| RF-002 | 3 modos de selección de modelo (Auto/Manual/Expert) | 🔥 Alta | ✅ |
| RF-003 | Auto-selección: RAM <6GB→1.5B, 6-8GB→Gemma3:4B, 8-12GB→Qwen7B, >12GB→Qwen14B | 🔥 Alta | ✅ |
| RF-004 | Selección Manual: mostrar solo modelos compatibles con hardware detectado | 🔥 Alta | ✅ |
| RF-005 | Modo Expert: entrada libre con advertencia si recursos insuficientes | 🟡 Media | ✅ |
| RF-006 | Guardar config local en .env (ARES_LLM_PROVIDER, OLLAMA_MODEL, OLLAMA_BASE_URL) | 🔥 Alta | ✅ |
| RF-007 | Dual-provider routing: tareas basicas → local, complejas → cloud | 🔥 Alta | ✅ |
| RF-008 | Fail-over automatico: cloud falla → local con cooldown 1min | 🔥 Alta | ✅ |
| RF-009 | Token optimizer: limite configurable, over-budget → todo a local | 🟡 Media | ✅ |
| RF-010 | Endpoint GET /api/neural/local-status | 🟡 Media | ✅ |
| RF-011 | Registro de Ollama en ai_providers DB al instalar | 🟡 Media | ✅ |

## 2. Requisitos No Funcionales

| ID | Descripción | Métrica |
|---|---|---|
| RNF-001 | Modelo local debe responder en <30s para tareas background | 13s medido en prod ✅ |
| RNF-002 | Fail-over debe ser transparente para ARES | Sin cambios en flujo actual ✅ |
| RNF-003 | Modelo local no debe consumir >1.5GB RAM en producción | 98.4MB medido ✅ |
| RNF-004 | install.sh debe funcionar sin intervención en modo Auto | single curl pipe ✅ |

## 3. Modelos Soportados

| RAM | Modelo Auto | Alternativas Manual |
|---|---|---|
| <6GB | qwen2.5-coder:1.5b | Solo 1.5B |
| 6-8GB | gemma3:4b | 1.5B, Gemma3:4B |
| 8-12GB | qwen2.5-coder:7b | 1.5B, 3B, Gemma3:4B, 7B, Gemma3:12B |
| 12-16GB | qwen2.5:14b | + Qwen14B |
| >16GB | qwen2.5:14b | + Expert (cualquier modelo) |
