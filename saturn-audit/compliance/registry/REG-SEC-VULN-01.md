# REG-SEC-VULN-01 — Registro de Vulnerabilidades

**Formato:** Cada vulnerabilidad identificada debe ser registrada aquí.

---

## Vulnerabilidades Activas

| ID | Fecha | Categoría | Severidad | CVSS | Descripción | Estado | Responsable | SLA | Solución |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

## Vulnerabilidades Cerradas

| ID | Fecha | Categoría | Severidad | CVSS | Descripción | Fecha Cierre | Sprint | Fix |
|---|---|---|---|---|---|---|---|---|
| VULN-001 | 2026-05-03 | Mass Assignment | Critical | 8.8 | Role elevation via POST /api/admin/create | 2026-05-03 | Sprint 22 | Role forzado a admin |
| VULN-002 | 2026-05-03 | XSS Stored | Medium | 6.1 | HTML tags in username accepted | 2026-05-03 | Sprint 22 | Sanitización de username |
| VULN-003 | 2026-05-03 | CORS Wildcard | Medium | 5.1 | Access-Control-Allow-Origin: * | 2026-05-03 | Sprint 22 | Origen fijo |
| VULN-004 | 2026-05-03 | NoSQL Injection | Medium | 5.3 | HTTP 500 with $gt payload | 2026-05-03 | Sprint 22 | typeof validation |
| VULN-005 | 2026-05-03 | SSRF | Medium | 4.3 | Metadata endpoints reachable | 2026-05-03 | Sprint 22 | validateHost blocklist |
| VULN-006 | 2026-05-03 | Missing HSTS | Low | 3.7 | Strict-Transport-Security ausente | 2026-05-03 | Sprint 24 | helmet config |
| VULN-007 | 2026-05-03 | Missing Permissions | Low | 2.1 | Permissions-Policy ausente | 2026-05-03 | Sprint 24 | helmet config |
| VULN-008 | 2026-05-03 | X-XSS-Protection: 0 | Low | 3.3 | Header deshabilitado | 2026-05-03 | Sprint 24 | Middleware propio |

## Métricas

| Métrica | Valor |
|---|---|
| Total vulnerabilidades identificadas | 8 |
| Críticas (CVSS ≥ 9) | 0 |
| Altas (CVSS 7-8.9) | 0 |
| Medias (CVSS 4-6.9) | 4 |
| Bajas (CVSS < 4) | 3 |
| Cerradas | 8 (100%) |
| Tiempo promedio de remediación | < 24h |
