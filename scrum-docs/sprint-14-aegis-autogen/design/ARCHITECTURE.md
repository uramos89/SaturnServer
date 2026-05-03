# 🏗️ SDLC — Fase 2: Diseño
## Sprint 14: Aegis Auto-Generation Pipeline

---

## 1. Arquitectura de Componentes

```
┌──────────────────────────────────────────────────────────────────┐
│                     SERVER.TS (Bootstrap)                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  DB Schema: aegis_cache, aegis_generations, aegis_feedback │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  ARESWorker      │ │  ScriptValidator│ │  Neural Routes   │
│  ares-worker.ts  │ │ script-val.ts   │ │  neural.ts       │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ • processCycle  │ │ • validate()    │ │ • /generate-skill│
│ • analyzeIncident│ │ • dryRunRemote │ │ • /feedback      │
│ • checkCache    │ │ • detectDanger  │ │ • /feedback/:id  │
│ • checkAntiRec  │ │ • checkCommon   │ │                  │
│ • buildAegisPrm │ └─────────────────┘ └─────────────────┘
│ • tryExecOnSrv  │
│ • tryPromote    │
│ • chunkScript   │
│ • purgeIntelig  │
└─────────────────┘
```

## 2. Flujo de Datos

```
1. Threshold breach (threshold-engine.ts)
   → INSERT INTO incidents (status='open')

2. ARESWorker.processCycle()
   → SELECT incidents WHERE status='open'
   → analyzeIncident(incident)

3. analyzeIncident():
   a. classifyIncidentDomain() → "cpu.process"
   b. getDeterministicFallback() → script inmediato
   c. tryExecOnServer() → ejecuta fallback
   d. checkAntiRecurrencia() → ¿max 3 gen? ¿cooldown?
   e. Buscar skill existente por dominio jerárquico
   f. checkCache() → ¿cache hit? (aegis_cache table)
   g. buildAegisPrompt() → construye prompt con ContextP
   h. getLLMResponse() → IA genera skill
   i. ScriptValidator.validate() → syntax + seguridad
   j. chunkScript() → dividir si >100 líneas
   k. dryRunRemote() → simular en servidor
   l. INSERT INTO skills (id='auto-{timestamp}')
   m. INSERT INTO aegis_generations (incident_id, iteration)
   n. storeCache() → aegis_cache table
   o. tryExecOnServer() → ejecutar skill real
   p. tryPromoteSkill() → ¿>80% éxito? → permanente
   q. sendNotification() → notificar resultado
```

## 3. Estructura de Tablas

```sql
-- Cache de skills generadas
aegis_cache (
  cache_key TEXT PRIMARY KEY,        -- "{dominio}:{serverId}"
  skill_script TEXT,                  -- Script generado
  skill_metadata TEXT,                -- JSON con metadatos
  created_at DATETIME DEFAULT NOW,    -- Fecha creación
  ttl_minutes INTEGER DEFAULT 60      -- Time-to-live
)

-- Registro de generaciones (anti-recurrencia)
aegis_generations (
  id TEXT PRIMARY KEY,                -- "aegis-{timestamp}-{rand}"
  incident_id TEXT NOT NULL,          -- Incidente raíz
  server_id TEXT,                     -- Servidor afectado
  iteration INTEGER DEFAULT 1,        -- # de generación (max 3)
  skill_id TEXT,                      -- Skill generada
  status TEXT DEFAULT 'generated',    -- generated|failed|promoted
  prompt_sent TEXT,                   -- Prompt exacto al LLM
  prompt_used TEXT,                   -- Respuesta del LLM (JSON)
  confidence REAL,                    -- Confianza de la IA
  created_at DATETIME DEFAULT NOW
)

-- Feedback del administrador
aegis_feedback (
  id TEXT PRIMARY KEY,                -- "fb-{timestamp}-{rand}"
  skill_id TEXT NOT NULL,             -- Skill calificada
  incident_id TEXT,                   -- Incidente relacionado
  rating INTEGER CHECK(1-5),         -- Calificación
  comment TEXT,                       -- Comentario opcional
  created_at DATETIME DEFAULT NOW
)
```

## 4. Clasificación Jerárquica de Dominios

```
cpu.process          → Proceso específico consume CPU
cpu.system.kernel    → Kernel issue
cpu.system.load      → Load average alta
cpu.generic          → CPU alta sin clasificación
memory.process.leak  → Fuga de memoria en proceso
memory.generic       → Memoria alta sin clasificar
disk.fs.mount_full   → Partición llena
disk.io.saturation   → I/O saturado
disk.generic         → Disco sin clasificar
process.crash        → Proceso caído
process.zombie       → Proceso zombie
process.generic      → Proceso sin clasificar
network.timeout      → Timeout de red
network.port         → Puerto específico
network.generic      → Red sin clasificar
unknown.generic      → No clasificable
```
