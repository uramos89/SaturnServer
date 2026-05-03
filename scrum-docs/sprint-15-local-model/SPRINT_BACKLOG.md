# 🏃 Sprint 15 — Motor Local Qwen + Fail-Over ARES

**Periodo:** 2026-05-03
**Objetivo:** Instalar y configurar Qwen2.5-Coder como modelo local de ARES, recablear funciones básicas al local, crear fail-over automático y optimizar consumo de tokens.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Instalación automática de Ollama + Qwen en install.sh
**Como** administrador,
**Quiero** que al ejecutar `install.sh` se instale Ollama y el modelo local adecuado,
**Para** que ARES tenga un motor local desde el primer inicio.

**Criterios de Aceptación:**
- **Dado** un servidor sin Ollama, **cuando** se ejecuta `install.sh`, **entonces** se instala Ollama automáticamente
- **Dado** Ollama instalado, **cuando** se completa la instalación, **entonces** se descarga el modelo Qwen2.5-Coder adecuado según RAM disponible
- **Dado** RAM disponible < 6GB, **cuando** se selecciona el modelo, **entonces** se elige `qwen2.5-coder:1.5b`
- **Dado** RAM disponible entre 6-8GB, **cuando** se selecciona el modelo, **entonces** se elige `qwen2.5-coder:3b`
- **Dado** RAM disponible > 8GB, **cuando** se selecciona el modelo, **entonces** se elige `qwen2.5-coder:7b`
- **Dado** el modelo descargado, **cuando** se configura, **entonces** se registra como provider `ollama` en `ai_providers` con enabled=1

### US-002: Wizard de configuración dual (local + cloud)
**Como** administrador,
**Quiero** que el setup wizard muestre el estado del modelo local y opción de configurar API cloud,
**Para** tener ambos motores disponibles desde el inicio.

**Criterios de Aceptación:**
- **Dado** el wizard de instalación, **cuando** se ejecuta, **entonces** muestra el estado de Ollama (instalado/corriendo/modelo)
- **Dado** el wizard, **cuando** se configura la API cloud, **entonces** muestra input para API Key + selector de modelo
- **Dado** una API key ingresada, **cuando** se hace clic en "Test", **entonces** prueba la conexión y muestra resultado
- **Dado** ambos motores configurados, **cuando** se completa el wizard, **entonces** se registran en DB (local enabled=1, cloud enabled=1)

### US-003: Recablear ARES a modelo local para tareas base
**Como** sistema,
**Quiero** que ARES use el modelo local (Qwen) para procesos básicos,
**Para** no consumir tokens en tareas rutinarias.

**Criterios de Aceptación:**
- **Dado** un incidente de threshold simple (CPU > 90%), **cuando** ARES lo analiza, **entonces** usa el modelo local en lugar del cloud
- **Dado** una evaluación de métricas, **cuando** ARES procesa thresholds, **entonces** usa el modelo local
- **Dado** una clasificación de dominio de incidente, **cuando** ARES la ejecuta, **entonces** usa el modelo local
- **Dado** un análisis de incidente completo, **cuando** se requiere generación de script, **entonces** usa el modelo cloud si está disponible

### US-004: Fail-over automático (cloud → local)
**Como** sistema,
**Quiero** que si el cloud API falla (sin tokens, timeout, error de red), ARES caiga al modelo local,
**Para** que el sistema nunca se quede sin capacidad de respuesta.

**Criterios de Aceptación:**
- **Dado** una llamada al cloud API, **cuando** devuelve HTTP 401/403 (token inválido), **entonces** ARES cambia automáticamente al modelo local
- **Dado** una llamada al cloud API, **cuando** excede el timeout (30s), **entonces** ARES cambia al modelo local
- **Dado** una llamada al cloud API, **cuando** devuelve HTTP 429 (rate limit), **entonces** ARES espera 5s, reintenta cloud, si falla → local
- **Dado** una llamada al cloud API, **cuando** hay error de red, **entonces** ARES cambia al modelo local
- **Dado** el fail-over activado, **cuando** se restaura el cloud API, **entonces** ARES vuelve al cloud automáticamente

### US-005: Balanceador de tokens (Token Optimizer)
**Como** sistema,
**Quiero** un balanceador que decida qué tareas van al local y cuáles al cloud,
**Para** optimizar el consumo de tokens y reducir costos.

**Criterios de Aceptación:**
- **Dado** una tarea de tipo "basic" (threshold eval, métricas, clasificación), **cuando** se envía, **entonces** siempre va al modelo local
- **Dado** una tarea de tipo "complex" (generar script, análisis profundo, generar skill), **cuando** se envía, **entonces** va al cloud si está disponible
- **Dado** una tarea "complex" sin cloud disponible, **cuando** se envía, **entonces** va al modelo local como fallback
- **Dado** el balanceador activo, **cuando** se usa el cloud, **entonces** registra el conteo de tokens consumidos
- **Dado** un límite de tokens configurado, **cuando** se alcanza, **entonces** cambia todo al modelo local hasta reset

### US-006: Endpoint de estado del motor local
**Como** administrador,
**Quiero** consultar el estado del modelo local (Ollama),
**Para** saber si está corriendo y qué modelo tiene cargado.

**Criterios de Aceptación:**
- **Dado** el endpoint `GET /api/neural/local-status`, **cuando** se invoca, **entonces** devuelve: `{ ollama_running: true/false, model: "qwen2.5-coder:1.5b", ram_usage: "1.2GB", status: "ready/loading/error" }`
- **Dado** Ollama caído, **cuando** se invoca el endpoint, **entonces** devuelve `{ ollama_running: false, status: "error", error: "..." }`

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Items planificados | 6 |
| Completados | 0 |
| Esfuerzo estimado | ~8-10 horas |

---

## 🧠 Selección Automática de Modelo

| RAM | Modelo | Comando Ollama |
|---|---|---|
| 4-6 GB | qwen2.5-coder:1.5b | `ollama pull qwen2.5-coder:1.5b` |
| 6-8 GB | qwen2.5-coder:3b | `ollama pull qwen2.5-coder:3b` |
| 8-12 GB | qwen2.5-coder:7b | `ollama pull qwen2.5-coder:7b` |
| 12-16 GB | qwen2.5:14b | `ollama pull qwen2.5:14b` |

**Producción (.134):** 3.8GB RAM → **qwen2.5-coder:1.5b** ✅
**Desarrollo (.133):** 7.7GB RAM → **qwen2.5-coder:3b** ✅
