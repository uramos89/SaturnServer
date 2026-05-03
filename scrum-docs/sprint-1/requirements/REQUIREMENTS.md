# 📋 SDLC — Requisitos
## sprint-1

## Requisitos Funcionales

- | Métrica | Valor |
- |---|---|
- | Total US planificadas | 17 |
- | Completadas | 17 |
- | Bugs encontrados y fixeados | 3 |
- | Features extras agregadas | 1 (test-key endpoint + UI) |
- | Velocidad estimada | 40 story points |
- | Velocidad real | 40 story points |
- | Item | US ID | Tipo | Prioridad | Esfuerzo | Estado | Notas |
- |---|---|---|---|---|---|---|
- | Login/Auth | US-001 | Feature | 🔥 Alta | 1 | ✅ Done | Endpoint `/api/admin/login` |
- | Dashboard stats | US-002 | Feature | 🔥 Alta | 1 | ✅ Done | Cards informativas |
- | Skills → Import | US-003 | Feature | 🔥 Alta | 2 | ✅ Done | POST /api/skills/import |
- | Skills → Assign | US-004 | Feature | 🔥 Alta | 3 | ✅ Done | POST /api/skills/assignments |
- | Skills → Run | US-005 | Feature | 🔥 Alta | 3 | ✅ Done | Frontend envía campos correctos |
- | Neural generate | US-006 | Feature | 🔥 Alta | 5 | ✅ Done | Scripts reales con Gemini 2.5 Flash |
- | Credentials → Add | US-007 | Feature | 🔥 Alta | 2 | 🐛 Fixed | Bug: `credentials` vs `content` |
- | Credentials → Delete | US-008 | Feature | 🔥 Alta | 1 | ✅ Done | DELETE /api/credentials/:id |
- | Remediation mode | US-009 | Feature | 🔥 Alta | 2 | ✅ Done | POST /api/remediation/config |
- | ContextP explorer | US-010 | Feature | 🔥 Alta | 2 | ✅ Done | GET /api/contextp/files |

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
