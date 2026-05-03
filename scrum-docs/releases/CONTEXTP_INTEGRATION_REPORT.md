# 📚 ContextP — Reporte de Integración en Saturn Server

> **Versión:** 0.8.0
> **Fecha:** 2026-05-03

---

## 1. ¿Qué es ContextP?

ContextP (Context Persistence) es el **sistema de memoria arquitectónica persistente** de Saturn. Funciona como una base de conocimiento que almacena:

- **Contratos**: Reglas, políticas y descripciones de la organización e infraestructura
- **Parámetros**: Preferencias del admin, configuración del proyecto, restricciones operativas
- **Auditoría**: Registro histórico de operaciones exitosas, fallidas y exploraciones
- **Métricas**: Historial de rendimiento de servidores archivado diariamente
- **Índice**: INDEX_MASTER que centraliza todo el conocimiento

No es una base de datos relacional — es un **sistema de archivos estructurado** con archivos markdown que cualquier service puede leer.

---

## 2. Estructura Física

```
ContextP/
├── cpini.md                          ← Inicialización del contexto
├── _INDEX/
│   └── INDEX_MASTER.md               ← Índice central de conocimiento
├── CONTRACTS/
│   ├── ROOT_CONTRACT.md              ← Contexto organizacional y políticas
│   ├── TECH_CONTRACT.md              ← Stack tecnológico y arquitectura
│   ├── FUNC_CONTRACT.md             ← Mapa de funcionalidades y endpoints
│   └── STRUCT_CONTRACT.md           ← Estructura de directorios del proyecto
├── PARAMS/
│   └── user_preferences.md          ← Preferencias del administrador
├── IDENTITY/
│   └── credentials_vault/           ← Credenciales cloud encriptadas
└── AUDIT/
    ├── success/                     ← Operaciones exitosas
    ├── failure/                     ← Operaciones fallidas
    ├── exploration_log/            ← Registros de descubrimiento
    └── metrics/                    ← Métricas históricas archivadas
```

---

## 3. Integraciones

### 3.1 API REST — ContextP Explorer

| Endpoint | Método | Descripción | Implementación |
|---|---|---|---|
| `/api/contextp/files` | GET | Árbol de archivos de SKILLS, PARAMS, IDENTITY, AUDIT | `server.ts:1519` |
| `/api/contextp/read?path=` | GET | Contenido de un archivo específico | `server.ts:1546` |

Limitación: el explorer no muestra CONTRACTS. El backend `contextp-service.ts` sí los lee directamente.

### 3.2 Backend Service — `src/lib/contextp-service.ts` (163 líneas)

| Función | Propósito | Usada por |
|---|---|---|
| `getStatus()` | Estado completo de ContextP (fase, contratos, patrones, deuda técnica) | Telegram bot, API |
| `getContractContent(name)` | Contenido de un contrato específico | Telegram bot |
| `getIndexContent()` | Contenido del INDEX_MASTER | — |
| `getMetricsContent()` | Contenido de métricas archivadas | — |
| `writeAuditLog(entry)` | Escribe un registro de auditoría a disco | ARES Worker, SSH, comandos |
| `getAuditLogs()` | Lista los últimos logs de auditoría | Telegram bot |
| `getParams()` | Lee preferencias, config y restricciones | Telegram bot |
| `getCpiniContent()` | Contenido del archivo de inicialización | — |

### 3.3 ARES Worker — `src/lib/ares-worker.ts`

El worker escribe auditoría vía `writeAuditLog()` en dos momentos clave:

```typescript
// Cuando un incidente se resuelve vía IA (línea 263)
writeAuditLog({
  type: "success", domain: "NEURAL",
  title: "ARES Analysis Completed",
  detail: "Proposed solution with X% confidence"
});

// Cuando se completa una ejecución proactiva (línea 319)
writeAuditLog({
  type: "success", domain: "NEURAL",
  title: "Proactive execution completed",
  detail: "Activity X executed on server Y"
});
```

### 3.4 Archive de Métricas — `server.ts:415-440`

Cada 24h, `archiveMetricsToContextP()` toma los promedios de CPU/RAM de `process_metrics_history` y los archiva como un registro de auditoría markdown en ContextP/AUDIT/success/. Esto provee trazabilidad histórica de rendimiento.

### 3.5 Telegram Bot — `src/services/telegram-service.ts`

Integración más rica. El bot importa 5 funciones de ContextP:

| Comando del bot | Función ContextP | Qué muestra |
|---|---|---|
| `/context` | `getStatus()` | Estado: fase, contratos, patrones, deuda técnica, servidores con problemas, auditoría reciente |
| `/context audit` | `getAuditLogs()` | Últimos 10 registros de auditoría |
| `/context params` | `getParams()` | Preferencias del admin, configuración, restricciones |
| `/context alerts` | `getStatus()` + DB | Servidores con CPU > 85, RAM > 85, DISK > 85, offline |
| `/contract` | `getContractContent()` | Lista de contratos disponibles |
| `/contract <name>` | `getContractContent()` | Contenido completo del contrato |
| `/analyze` | `getStatus()` + DB | Diagnóstico completo del sistema con contexto organizacional |

### 3.6 Base de Datos — Tabla `contextp_entries`

```sql
CREATE TABLE contextp_entries (
    path TEXT PRIMARY KEY,
    content TEXT,
    type TEXT,
    lastUpdated TEXT
);
```

Actualmente con 0 entradas — es una tabla预留 que no se está usando activamente. Todo el contenido de ContextP vive en archivos del filesystem, no en SQLite.

---

## 4. Flujo de Datos

```
Admin escribe contrato en ContextP/CONTRACTS/
  │
  ├── Telegram Bot lee con /contract ROOT_CONTRACT
  │   └── Responde con el contenido formateado
  │
  ├── Dashboard explora con /api/contextp/files
  │   └── Muestra árbol de archivos
  │
  ├── ARES Worker escribe log con writeAuditLog()
  │   └── Archivo markdown en AUDIT/success|failure/
  │
  └── archiveMetricsToContextP() cada 24h
      └── Archiva promedios de procesos en AUDIT/success/
```

---

## 5. Estado Actual

| Componente | Estado | Observaciones |
|---|---|---|
| Directorio ContextP/ | ✅ Creado | 12 archivos, 4 directorios |
| ROOT_CONTRACT | ✅ Poblado | Organización, políticas, umbrales |
| TECH_CONTRACT | ✅ Poblado | Stack, data flow, storage, security |
| FUNC_CONTRACT | ✅ Poblado | Endpoints, funciones autónomas |
| STRUCT_CONTRACT | ✅ Poblado | Árbol de directorios completo |
| PARAMS | ✅ Poblado | user_preferences con preferencias reales |
| INDEX_MASTER | ✅ Poblado | Índice central de conocimiento |
| cpini.md | ✅ Poblado | Inicialización del contexto |
| contextp-service.ts | ✅ Funcional | 163 líneas, 8 funciones exportadas |
| API explorer | ✅ Funcional | GET /api/contextp/files, GET /api/contextp/read |
| ARES Worker audit | ✅ Integrado | writeAuditLog en incidentes y ejecuciones |
| Metrics archive | ✅ Integrado | archiveMetricsToContextP() cada 24h |
| Telegram bot | ✅ Integrado | 7 comandos ContextP |
| Frontend explorer | ✅ Funcional | Pestaña "ContextP" en el dashboard |
| Tabla contextp_entries | ⚠️ Vacía | Reservada, no usada activamente |
| CONTRACTS en explorer API | ⚠️ No visible | API solo muestra SKILLS, PARAMS, IDENTITY, AUDIT |

---

## 6. Recomendaciones

1. **Incluir CONTRACTS en el explorer API** — Modificar `server.ts:1528` para agregar `{ name: 'CONTRACTS', type: 'dir', children: getFiles('ContextP/CONTRACTS') }`
2. **Poblar tabla `contextp_entries`** — Sincronizar los archivos de ContextP con la DB para búsqueda rápida
3. **Más contratos**: AUDIT_CONTRACT (reglas de compliance) y IDENTITY_CONTRACT (políticas de vault)
4. **Backup de ContextP** — Incluir el directorio en las rutinas de backup
