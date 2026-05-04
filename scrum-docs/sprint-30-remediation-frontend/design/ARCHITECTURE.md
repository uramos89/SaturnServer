# 🏗️ SDLC — Diseño
## sprint-30-remediation-frontend

## Contexto
Corregir 10 bugs identificados en la auditoría visual del frontend y mejorar la seguridad de sesiones.

## Bugs y Soluciones

```
B-001/B-002: Safe array fallbacks
  ├─ Causa: API devuelve objeto en vez de array
  ├─ Solución: Array.isArray() + safe fallback (data || [])
  └─ Archivos: App.tsx (todos los useState)

B-003: ContextP Tab
  ├─ Causa: Selector text no coincide con sidebar
  ├─ Solución: Error handling + empty state messages
  └─ Archivos: ContextP Explorer component

B-004/B-005: Notifications + Admin
  ├─ Causa: api import faltante + response no validada
  ├─ Solución: Agregar import, safe property fallbacks
  └─ Archivos: AdminDashboard.tsx, Notifications.tsx

B-006: Skills empty state
  ├─ Causa: Skills sin contenido real en DB
  ├─ Solución: Empty state message cuando no hay skills
  └─ Archivos: Skills library component

B-007: Interactive terminal
  ├─ Causa: Sin historial de comandos
  ├─ Solución: up/down arrow history + result persistence
  └─ Archivos: Terminal component

B-008: Results persistence
  ├─ Causa: Componente se remonta al navegar
  ├─ Solución: Cache por tab ID en ServerDetailView
  └─ Archivos: ServerDetailView.tsx

B-009: Session timeout
  ├─ Causa: Sin cierre automático por inactividad
  ├─ Solución: Detectar mouse/keyboard/click > 15 min → logout
  └─ Archivos: Auth context + localStorage

B-010: IP blocking
  ├─ Causa: Rate limit global, no por IP
  ├─ Solución: 5 intentos fallidos → bloquear IP 5 min
  └─ Archivos: Login handler + rate limiter
```

## Archivos involucrados
- `src/App.tsx` — Safe fallbacks para arrays
- `src/components/AdminDashboard.tsx` — api import + fallbacks
- `src/components/Notifications.tsx` — Response validation
- `src/components/ContextPExplorer.tsx` — Error handling
- `src/components/SkillsLibrary.tsx` — Empty state
- `src/components/Terminal.tsx` — History + persistence
- `src/components/ServerDetailView.tsx` — Tab cache
- `src/lib/auth.ts` — Session timeout + IP blocking
