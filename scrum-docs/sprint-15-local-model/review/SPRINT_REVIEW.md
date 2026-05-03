# 📊 SDLC — Revisión Sprint 15
## Motor Local Qwen2.5-Coder + Fail-Over ARES

---

## Métricas del Sprint

| Métrica | Valor |
|---|---|
| US planificadas | 6 |
| US completadas | 6 ✅ |
| SDLC completo | Requirements, Design, Tests, Review ✅ |
| Archivos modificados | 4 (install.sh, llm-service.ts, ares-worker.ts, neural.ts) |
| Líneas nuevas | ~250 |
| Commits a GitHub | `3485f07` |
| Push a GitHub | ✅ |

## Resultados Técnicos

| Aspecto | Medición |
|---|---|
| Latencia modelo local (1.5b) | 13s promedio |
| Consumo RAM modelo | 98.4MB |
| Fail-over cloud→local | Automático, cooldown 1min |
| Modos de selección | 3 (Auto/Manual/Expert) |
| RAM en producción | 3.8GB → modelo 1.5B correcto |
| Ollama versión | 0.22.1 |

## Pendientes para Sprint 16

| ID | Pendiente | Prioridad |
|---|---|---|
| P-001 | Frontend: fix test AI (resultado se borra al editar input) | 🔴 Alta |
| P-002 | Frontend: UI para configurar canales de notificación (email, telegram, webhook) | 🟡 Media |
| P-003 | Frontend: test de notificación configurada | 🟡 Media |
| P-004 | Product backlog: agregar sprints 11-16 | 🟡 Media |
| P-005 | Sprints 0-4: agregar acceptance criteria | 🟡 Baja |
