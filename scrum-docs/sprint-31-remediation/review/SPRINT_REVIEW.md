# Sprint 31 — Review / Retrospective

**Fecha:** 2026-05-04
**Sprint:** 31 — Remediación Post-Auditoría

---

## Resumen

| Métrica | Valor |
|---|---|
| US planificadas | 4 |
| US completadas | 4 (100%) |
| Bugs corregidos | 1 (B-011) |
| Hallazgos auditados | 6 (H-001 a H-006) |
| Hallazgos resueltos | 5 (H-001, H-002, H-003, H-004, H-006) |
| Commits | 4 |
| Push a GitHub | ✅ `6f95d06` |
| Build | ✅ Compila |

---

## Resultados por US

| US | Descripción | Estado | Evidencia |
|---|---|---|---|
| US-001 | Path traversal validation | ✅ | `curl` devuelve HTTP 400 con `INVALID_PATH` para `../`, `%2e%2e%2f`, `file://`, `/proc/` |
| US-002 | Destructive incident filter | ✅ | `POST /api/neural/rca` con `delete_server` → HTTP 400 `DESTRUCTIVE_DOMAIN` |
| US-003 | Server-side user validation | ✅ | Token inválido → limpia localStorage → redirige a login |
| US-004 | Empty state SSH instructions | ✅ | AdminDashboard muestra quick start guide con 3 pasos + comando docker |

---

## Bugs Encontrados y Corregidos

| ID | Bug | Severidad | Causa | Fix |
|---|---|---|---|---|
| B-011 | Identity Vault crash | 🔴 Alta | `setCloudCreds(data)` sin `Array.isArray()` | Agregar `Array.isArray(data) ? data : []` |

---

## Lecciones Aprendidas

1. **Safe guards incompletos:** Aunque el fetchData principal ya usaba `Array.isArray()`, los subcomponentes con su propio fetch (como `CredentialsView.fetchCreds()`) no lo hacían. Lección: toda llamada a `set<ArrayState>(data)` debe validar.

2. **Deploy correcto de archivos:** El comando `rsync -avz src/App.tsx dist/ saturn:/home/ubuntu/saturn/` copia App.tsx a la raíz, no a `src/`. Hay que especificar la ruta completa: `rsync -avz src/App.tsx saturn:/home/ubuntu/saturn/src/App.tsx`.

3. **ErrorBoundary como indicador:** Un ErrorBoundary atrapando un error en un componente oculta TODOS los demás componentes. El Identity Vault caído ocultaba que Skills, Proactive y ContextP en realidad funcionaban bien.

---

## Hallazgos Pendientes

| ID | Descripción | Prioridad |
|---|---|---|
| H-005 | Panel Admin sin inputs detectables por test | ℹ️ Baja |

---

## Velocidad del Sprint

- Inicio: 2026-05-04 ~12:00 UTC
- Fin: 2026-05-04 ~13:30 UTC
- Duración: ~1.5 horas
- US completadas: 4 (esfuerzo estimado: 10h)
- Bugs resueltos: 1

---

## Veredicto

🟢 **Sprint completado exitosamente.** Todos los hallazgos de la auditoría de seguridad fueron remediados. El Identity Vault ahora funciona correctamente. Queda pendiente solo H-005 (mejora de accesibilidad en tests, prioridad baja).
