# 🏃 Sprint 1 — Backlog

> **Período:** 2026-05-03 al 2026-05-10
> **Objetivo:** Verificar y arreglar todos los botones del frontend contra backend real
> **Sprint Goal:** Matriz de funcionalidad completa al 100%

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Total US planificadas | 17 |
| Completadas | 17 |
| Bugs encontrados y fixeados | 3 |
| Features extras agregadas | 1 (test-key endpoint + UI) |
| Velocidad estimada | 40 story points |
| Velocidad real | 40 story points |

---

> **Feature Reference:** EP-03 (ARES Neural Engine), EP-04 (Remote Execution), EP-02 (Identity Vault), EP-05 (Alert Engine), EP-07 (ContextP), EP-09 (System Management)

## 📋 Items del Sprint

| Item | US ID | Tipo | Prioridad | Esfuerzo | Estado | Notas |
|---|---|---|---|---|---|---|
| Login/Auth | US-001 | Feature | 🔥 Alta | 1 | ✅ Done | Endpoint `/api/admin/login` |
| Dashboard stats | US-002 | Feature | 🔥 Alta | 1 | ✅ Done | Cards informativas |
| Skills → Import | US-003 | Feature | 🔥 Alta | 2 | ✅ Done | POST /api/skills/import |
| Skills → Assign | US-004 | Feature | 🔥 Alta | 3 | ✅ Done | POST /api/skills/assignments |
| Skills → Run | US-005 | Feature | 🔥 Alta | 3 | ✅ Done | Frontend envía campos correctos |
| Neural generate | US-006 | Feature | 🔥 Alta | 5 | ✅ Done | Scripts reales con Gemini 2.5 Flash |
| Credentials → Add | US-007 | Feature | 🔥 Alta | 2 | 🐛 Fixed | Bug: `credentials` vs `content` |
| Credentials → Delete | US-008 | Feature | 🔥 Alta | 1 | ✅ Done | DELETE /api/credentials/:id |
| Remediation mode | US-009 | Feature | 🔥 Alta | 2 | ✅ Done | POST /api/remediation/config |
| ContextP explorer | US-010 | Feature | 🔥 Alta | 2 | ✅ Done | GET /api/contextp/files |
| AI Provider config | US-011 | Feature | 🔥 Alta | 3 | ✅ Done | POST /api/ai/providers/configure |
| Gemini integration | US-012 | Feature | 🔥 Alta | 5 | ✅ Done | gemini-2.5-flash funcional |
| Proactive → Add | US-013 | Feature | 🟡 Media | 2 | ✅ Done | POST /api/proactive |
| Proactive → Delete | US-014 | Feature | 🟡 Media | 1 | ✅ Done | DELETE /api/proactive/:id |
| Error debugging | US-015 | Fix | 🟡 Media | 1 | ✅ Done | Silent catch → visible error |
| API key decrypt | US-016 | Fix | 🔥 Alta | 3 | ✅ Done | decrypt() en llm-service.ts |

---

## 🐛 Bugs encontrados durante el Sprint

| Bug | Archivo | Síntoma | Fix |
|---|---|---|---|
| Credentials field mismatch | `src/App.tsx:2998` | 400 "Missing fields" | Cambiar `credentials: {...}` por `content: JSON.stringify(...)` |
| API key encriptada sin decrypt | `src/services/llm-service.ts:81` | Gemini siempre fallaba con 401 | Agregar `decrypt()` y detectar formato `iv:ciphertext` |
| Silent error catch | `server.ts:1292` | Errores de IA invisibles | Agregar `console.error` y devolver `error` en response |

## Criterios de Aceptación

### US-001: Frontend conectado a backend real
**Dado** el dashboard de Saturn, **cuando** se navega por todas las tabs, **entonces** cada botón y acción ejecuta llamadas API reales y recibe respuestas del backend.
### US-002: Matriz de funcionalidad
**Dado** todos los endpoints del backend, **cuando** se mapean contra el frontend, **entonces** no hay botones rotos ni llamadas a APIs inexistentes.
### US-003: Endpoints funcionales
**Dado** cada endpoint REST, **cuando** se invoca con datos válidos, **entonces** responde HTTP 200 con el formato esperado.
