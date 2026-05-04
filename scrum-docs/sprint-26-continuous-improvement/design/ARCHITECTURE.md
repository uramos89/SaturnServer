# 🏗️ SDLC — Diseño
## sprint-26-continuous-improvement

## Contexto
Transicionar de desarrollo activo a mejora continua con CI/CD, monitoreo y KPIs.

## Pipeline CI/CD
```
monitoring/ci-pipeline.sh
  ├─ 1. SAST (eslint-security + sonarjs)
  ├─ 2. SCA (npm audit)
  ├─ 3. Tests (vitest + playwright)
  ├─ 4. Build (npm run build)
  └─ 5. Deploy (rsync a .134 + pm2 restart)
```

## Ciclo de Mejora Continua
```
MONITOREAR (KPIs + logs + alerts)
    ↓
ANALIZAR (tendencias, cuellos de botella)
    ↓
PLANIFICAR (backlog de mejora)
    ↓
IMPLEMENTAR (sprint de mejora)
    ↓
MEDIR (impacto de cambios)
    ↓
[REPETIR]
```

## KPIs
| KPI | Target | Herramienta |
|---|---|---|
| Vulnerabilidades/sprint | < 3 | Security Suite |
| MTTR | < 48h | Registry |
| Cobertura tests | > 80% | Playwright + Vitest |
| Security score | > 90% | Security Suite |
| Uptime | > 99.9% | Health endpoint |
| Time between releases | < 7d | GitHub |

## Competitive Analysis
Comparativa Saturn vs 9 plataformas (Ansible, Salt, Puppet, Chef, Rundeck, StackStorm, n8n, Temporal, Jenkins) en 24+ características.

## Archivos involucrados
- `monitoring/ci-pipeline.sh` — Pipeline CI/CD
- `monitoring/kpi-dashboard/` — Dashboards de KPIs
- `docs/comparative-analysis.md` — Análisis comparativo
