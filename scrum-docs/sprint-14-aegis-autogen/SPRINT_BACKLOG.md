# 🏃 Sprint 14: Aegis Auto-Generation Pipeline

> **Feature Reference:** EP-03 (ARES Neural Engine)
> **Estado:** ⚠️ Parcial (US-001 ✅, US-002 ❌, US-003 ❌, US-004 ❌)

## Contexto
Aegis Architect v2 es una meta-skill que genera nuevas skills autónomamente.
ARES debe invocarla cuando no encuentra una skill existente para un incidente.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Endpoint POST /api/neural/generate-skill ✅
**Como** sistema,
**Quiero** un endpoint que genere nuevas skills vía IA desde un contexto,
**Para** crear skills autónomamente sin intervención humana.

**Criterios de Aceptación:**
- **Dado** el endpoint `POST /api/neural/generate-skill`, **cuando** recibe un body con `{ contexp: { proposito, restricciones, fuentes, estado_anterior } }`, **entonces** devuelve `{ nueva_skill: {...}, metadata_generacion: {...} }`
- **Dado** una solicitud sin `contexp.proposito`, **cuando** se envía, **entonces** responde HTTP 400 con `{ error: "contexp.proposito is required" }`
- **Dado** que Aegis Skill no está registrada en DB, **cuando** se invoca el endpoint, **entonces** responde HTTP 404
- **Dado** una respuesta de IA válida, **cuando** se genera la skill, **entonces** se guarda en DB + filesystem automáticamente
- **Dado** una respuesta de IA sin JSON válido, **cuando** falla el parseo, **entonces** devuelve error descriptivo sin colapsar el servidor

### US-002: ARES Auto-Generation en remediación ❌
**Como** sistema,
**Quiero** que ARES invoque Aegis automáticamente cuando no encuentra una skill existente,
**Para** cerrar el ciclo de remediación autónoma.

**Criterios de Aceptación:**
- **Dado** un incidente abierto, **cuando** ARES lo analiza, **entonces** busca una skill por tipo/dominio
- **Dado** que no existe skill para el incidente, **cuando** ARES no encuentra coincidencia, **entonces** invoca Aegis con el ContextP del servidor
- **Dado** que Aegis genera una skill, **cuando** la nueva skill se crea, **entonces** se auto-registra en DB y se ejecuta contra el servidor afectado
- **Dado** que la nueva skill se ejecuta, **cuando** se completa, **entonces** el resultado se registra en audit + notificación

### US-003: Pipeline completo (E2E) ❌
**Como** sistema,
**Quiero** que el pipeline completo funcione de inicio a fin:
Threshold → Incidente → ARES no encuentra skill → Aegis genera → Skill se ejecuta → Resultado registrado.

**Criterios de Aceptación:**
- **Dado** un threshold breach (CPU > 90%), **cuando** el threshold-engine detecta el evento, **entonces** se crea un incidente
- **Dado** el incidente creado, **cuando** ARES lo procesa, **entonces** busca una skill existente
- **Dado** que no encuentra skill, **cuando** ARES invoca Aegis, **entonces** recibe el ContextP completo del servidor
- **Dado** el ContextP, **cuando** la IA genera una nueva skill, **entonces** se registra en DB con ID único
- **Dado** la nueva skill registrada, **cuando** se ejecuta sobre el servidor, **entonces** el resultado se almacena en audit
- **Dado** la ejecución completada, **cuando** termina, **entonces** se envía notificación del resultado

### US-004: Auto-limpieza y versionado ❌
**Como** sistema,
**Quiero** gestionar el ciclo de vida de skills auto-generadas,
**Para** no saturar el sistema con skills temporales.

**Criterios de Aceptación:**
- **Dado** una skill generada automáticamente, **cuando** se crea, **entonces** su ID tiene prefijo `auto-`
- **Dado** que hay N skills auto-generadas, **cuando** se supera el límite configurable (default 50), **entonces** las más antiguas se eliminan
- **Dado** una skill auto-generada, **cuando** se consulta su metadata, **entonces** incluye `origin: aegis`

---

## 📊 Estado Real

| US | Estado | Código |
|---|---|---|
| US-001: generate-skill endpoint | ✅ Implementado | `POST /api/neural/generate-skill` en neural.ts |
| US-002: ARES Auto-Generation | ✅ Implementado | `analyzeIncident()` en ares-worker.ts invoca Aegis |
| US-003: Pipeline E2E | ✅ Implementado | Threshold → fallback inmediato → Aegis → validación → dry-run → ejecución |
| US-004: Auto-limpieza + versionado | ✅ Implementado | Purga inteligente en start(), promoción a permanente en tryPromoteSkill() |

### Mejoras adicionales implementadas (de la auditoría)

| Mejora | Ubicación |
|---|---|
| Anti-recurrencia (max 3 gen, cooldown 10min) | `checkAntiRecurrencia()` en ares-worker.ts |
| Cache de skills (1h TTL) | `aegis_cache` table + `checkCache()`/`storeCache()` |
| Fallback determinista inmediato | `getDeterministicFallback()` para CPU/memory/disk/process |
| Match jerárquico de dominios | `classifyIncidentDomain()` — 15+ dominios con subtipos |
| Dry-run obligatorio | `ScriptValidator.dryRunRemote()` + flag CONFIG.DRY_RUN_ENABLED |
| Chunking de skills >100 líneas | `chunkScript()` con checkpoints y resumen
| Syntax + seguridad | `ScriptValidator.validate()` — shellcheck, bash -n, detección de comandos peligrosos |
| Feedback loop | `POST /api/neural/feedback` + `GET /api/neural/feedback/:skillId` |
| Promoción a permanente | `tryPromoteSkill()` — >80% éxito en 5 ejec. → prefijo `persistent-` |
| Guardar prompt original | `aegis_generations.prompt_sent` almacena el prompt exacto enviado al LLM |
| Multi-provider fallback | Cloud API → fallback a Ollama local si cloud falla |
