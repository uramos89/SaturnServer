# 🏗️ SDLC — Diseño
## sprint-21-security-audit

## Contexto
Crear laboratorio de pruebas seguro y ejecutar auditoría destructiva completa.

## Arquitectura del Test Lab
```
create-lab.sh
  ├─ Docker build: saturn-test-lab (4 contenedores en 1 imagen)
  │   ├─ web01 (port 2222) → nginx + node_exporter
  │   ├─ db01  (port 2223) → mysql + prometheus
  │   ├─ load01 (port 2224) → haproxy + node_exporter
  │   └─ monitor01 (port 2225) → prometheus + grafana
  └─ RED: saturn-test-net (bridge)

Pentest Runner (audit-runner.js + scripts de ataque)
  ├─ Login → JWT bypass test
  ├─ Servers → SSRF, SQLi, path traversal
  ├─ Skills → Command injection, XSS
  ├─ Neural → Prompt injection
  ├─ Notifications → Webhook SSRF
  └─ Auth → Token manipulation, role escalation
```

## Hallazgos del Pentest
| Finding | Severidad | Tipo |
|---|---|---|
| FINDING-001 | 🟡 Medio | SQLi parcial en dobles comillas (HTTP 500) |
| FINDING-002 | 🟡 Medio | XSS almacenado en username (mitigado por React) |
| FINDING-003 | 🟡 Medio | Sin límite de payload en Express |
| FINDING-004 | 🟡 Medio | Rate limit global no por IP |

## Archivos involucrados
- `scripts/create-lab.sh` — Docker test lab
- `tests/e2e/audit-runner.js` — E2E audit
- `tests/e2e/pentest/` — Scripts de ataque
- `reports/pentest-report.html` — Reporte HTML
