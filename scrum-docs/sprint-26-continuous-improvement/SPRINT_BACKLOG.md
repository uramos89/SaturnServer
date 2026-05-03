# 🏃 Sprint 26 — Mejora Continua (CI/CD + Monitoreo + KPIs)

**Periodo:** 2026-05-03 → Indefinido
**Objetivo:** Transicionar de desarrollo activo a mejora continua con monitoreo automatizado, CI/CD y KPIs.

---

## 📋 Items del Sprint

| ID | Título | Prioridad | Estado |
|---|---|---|---|
| US-001 | Pipeline CI/CD automatizado (SAST + SCA + Tests) | 🔴 Alta | ⏳ |
| US-002 | Monitoreo continuo de seguridad (cron semanal) | 🔴 Alta | ⏳ |
| US-003 | Dashboard de KPIs de seguridad | 🟡 Media | ⏳ |
| US-004 | Automatización de reportes periódicos | 🟡 Media | ⏳ |
| US-005 | Ciclo de mejora: retro → plan → implement → measure | 🟡 Media | ⏳ |
| US-006 | Documentación de lecciones aprendidas (25 sprints) | 🔵 Baja | ⏳ |

---

## 📊 KPIS a monitorear

| KPI | Target | Frecuencia | Herramienta |
|---|---|---|---|
| Vulnerabilidades por sprint | < 3 | Por sprint | Security Suite |
| Tiempo de remediación (MTTR) | < 48h | Continuo | Registry |
| Cobertura de tests | > 80% | Semanal | Playwright + Vitest |
| Score de seguridad | > 90% | Semanal | Security Suite |
| Uptime de producción | > 99.9% | Continuo | Health endpoint |
| Tiempo entre releases | < 7 días | Por release | GitHub |

---

## 🔄 Ciclo de mejora continua

```
1. MONITOREAR (KPIs + logs + alerts)
         ↓
2. ANALIZAR (tendencias, cuellos de botella)
         ↓
3. PLANIFICAR (backlog de mejora)
         ↓
4. IMPLEMENTAR (sprint de mejora)
         ↓
5. MEDIR (impacto de cambios)
         ↓
6. REPETIR
```
