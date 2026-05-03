# 📋 SDLC — Fase 1: Requisitos
## Sprint 14: Aegis Auto-Generation Pipeline

---

## 1. Requisitos Funcionales

| ID | Descripción | Prioridad | Dependencia |
|---|---|---|---|
| RF-001 | Sistema debe generar skills autónomamente desde un contexto de incidente | 🔥 Alta | Ninguna |
| RF-002 | ARES debe invocar Aegis cuando no exista skill para un incidente | 🔥 Alta | RF-001 |
| RF-003 | Cache de skills generadas para evitar llamadas LLM redundantes (1h TTL) | 🔥 Alta | RF-001 |
| RF-004 | Anti-recurrencia: máx 3 generaciones por incidente, cooldown 10 min | 🔥 Alta | RF-002 |
| RF-005 | Fallback determinista inmediato mientras se genera la skill | 🔥 Alta | RF-002 |
| RF-006 | Validación sintáctica + seguridad antes de ejecutar skill generada | 🔥 Alta | RF-001 |
| RF-007 | Dry-run remoto obligatorio antes de ejecución real | 🔥 Alta | RF-006 |
| RF-008 | Match jerárquico de dominios (cpu.process.user.node) | 🟡 Media | RF-002 |
| RF-009 | Chunking para skills >100 líneas con checkpoints reanudables | 🟡 Media | RF-006 |
| RF-010 | Feedback loop: admin califica skill (1-5) | 🟡 Media | RF-001 |
| RF-011 | Promoción automática a permanente (>80% éxito en 5 ejec.) | 🟡 Media | RF-002 |
| RF-012 | Purga inteligente de skills auto-generadas (por éxito, no tiempo) | 🟡 Media | RF-011 |
| RF-013 | Almacenar prompt original usado para generar cada skill (auditoría) | 🟡 Media | RF-001 |
| RF-014 | Fail-over multi-provider: cloud → local si falla | 🟡 Media | RF-001 |

## 2. Requisitos No Funcionales

| ID | Descripción | Métrica |
|---|---|---|
| RNF-001 | Respuesta inmediata para incidentes críticos | < 5 segundos (fallback determinista) |
| RNF-002 | Sin pérdida de datos en auditoría | Todos los logs persisten en DB |
| RNF-003 | Sin comandos destructivos sin validación | Validador bloquea rm -rf /, DROP DATABASE, etc. |
| RNF-004 | Límite de skills auto-generadas | Configurable, default 500 |
| RNF-005 | Cache no debe crecer indefinidamente | TTL 60 min, purge automático |
| RNF-006 | La generación de skills no debe saturar el servidor | Max 3 generaciones por incidente |

## 3. Reglas de Negocio

| ID | Regla |
|---|---|
| RN-001 | Una skill auto-generada solo se ejecuta si pasa validación + dry-run |
| RN-002 | Una skill fallida 3 veces seguidas → cooldown 10 min |
| RN-003 | Una skill con >80% éxito y ≥5 ejecuciones → permanente |
| RN-004 | Una skill con <10% éxito y >3 ejecuciones → prioridad de purga |
| RN-005 | Una skill con 0 ejecuciones → prioridad de purga |
