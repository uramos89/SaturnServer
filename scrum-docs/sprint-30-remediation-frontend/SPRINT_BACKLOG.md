# 🏃 Sprint 30 — Remediación Frontend

**Periodo:** 2026-05-04
**Objetivo:** Corregir todos los bugs identificados en la auditoría visual del frontend.

---

## 📋 Bugs Identificados (del reporte de validación)

| ID | Bug | Sección | Severidad | Causa |
|---|---|---|---|---|
| B-001 | `E.map is not a function` | Skills, Admin, Settings | 🔴 Alta | API devuelve objeto en vez de array |
| B-002 | `r.filter is not a function` | Dashboard, Servers | 🔴 Alta | API devuelve objeto en vez de array |
| B-003 | ContextP tab no accesible | ContextP | 🟡 Media | Selector text no coincide |
| B-004 | Notifications con 3 errores JS | Notifications | 🟡 Media | API response no validada |
| B-005 | Administration con 11 errores JS | Admin | 🟡 Media | Múltiples fallos de datos |
| B-006 | Skills sin contenido real | Skills | 🟡 Media | Skills en DB sin scripts |
| B-007 | Terminal pobre (solo texto) | Server Detail | 🟡 Media | No hay terminal interactiva real |
| B-008 | Resultados desaparecen al navegar | Server Detail | 🟡 Media | Componente se remonta |
| B-009 | Sin timeout de sesión por inactividad | Global | 🟡 Media | No hay cierre automático |
| B-010 | Sin bloqueo de IP tras intentos fallidos | Login | 🟡 Media | Rate limit global, no por IP |

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Fix `E.map is not a function` (B-001)
**Criterios:**
- **Dado** que un endpoint devuelve `{error:"..."}` en vez de `[...]`, **cuando** se procesa la respuesta, **entonces** se valida con `Array.isArray()` antes de llamar a `.map()`.

### US-002: Fix `r.filter is not a function` (B-002)
**Criterios:**
- **Dado** que un endpoint devuelve datos no-array, **cuando** se llama a `.filter()`, **entonces** se usa `(data || []).filter()` como safe fallback.

### US-003: ContextP tab accesible (B-003)
**Criterios:**
- **Dado** el sidebar, **cuando** se hace clic en "ContextP Memory", **entonces** se navega a la vista de ContextP.

### US-004: Notifications + Admin sin errores (B-004, B-005)
**Criterios:**
- **Dado** las secciones Notifications y Admin, **cuando** se cargan, **entonces** no hay errores JS en consola.

### US-005: Terminal interactiva básica (B-007)
**Criterios:**
- **Dado** la pestaña Terminal, **cuando** se ingresa un comando, **entonces** se ejecuta vía API y muestra resultado sin perderse.

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Bugs a corregir | 8 |
| Items del sprint | 7 |
| Esfuerzo estimado | ~3-4 horas |
| Dependencia | Ninguna |
