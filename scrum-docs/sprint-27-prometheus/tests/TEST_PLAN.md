# 🧪 SDLC — Pruebas
## sprint-27-prometheus

## Pruebas

| Test | Descripción | Resultado |
|---|---|---|
| Formato Prometheus | GET /api/metrics retorna texto en formato exposition | ✅ |
| 9 métricas presentes | servers, online, cpu, mem, disk, incidents, skills, users, audit | ✅ |
| Labels por servidor | cpu/memory/disk incluyen hostname como label | ✅ |
| Prometheus UP | Target aparece como UP en Prometheus | ✅ |
| Grafana dashboard | Dashboard carga con gauges y stats | ✅ |

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
