# 🏗️ SDLC — Diseño
## sprint-27-prometheus

## Contexto
Exponer métricas de Saturn en formato Prometheus para observabilidad y monitoreo continuo.

## Arquitectura de Métricas
```
Saturn Server ──→ GET /api/metrics ──→ Prometheus exposition format
                      │
                      ├─ saturn_servers_total{status="online"} 3
                      ├─ saturn_cpu_percent{hostname="web01"} 45.2
                      ├─ saturn_memory_percent{hostname="web01"} 67.8
                      ├─ saturn_disk_percent{hostname="web01"} 72.1
                      ├─ saturn_incidents_total 5
                      ├─ saturn_skills_total 12
                      └─ saturn_users_total 1
                           │
                           ↓
                     Prometheus (scrape cada 15s)
                           │
                           ↓
                     Grafana Dashboard
```

## Métricas expuestas
| Métrica | Tipo | Labels |
|---|---|---|
| saturn_servers_total | gauge | status |
| saturn_cpu_percent | gauge | hostname |
| saturn_memory_percent | gauge | hostname |
| saturn_disk_percent | gauge | hostname |
| saturn_incidents_total | gauge | — |
| saturn_skills_total | gauge | — |
| saturn_users_total | gauge | — |
| saturn_audit_events_total | gauge | — |
| saturn_uptime_seconds | counter | — |

## Archivos involucrados
- `src/routes/metrics.ts` — Endpoint /api/metrics
- `monitoring/prometheus.yml` — Config scrape
- `monitoring/grafana-dashboard.json` — Dashboard JSON
