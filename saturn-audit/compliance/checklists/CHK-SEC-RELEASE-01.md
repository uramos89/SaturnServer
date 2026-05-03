# CHK-SEC-RELEASE-01 — Checklist de Release de Seguridad

**Versión:** 1.0 | **Release:** ________ | **Fecha:** ________

## ✅ Requisitos Obligatorios (Todos deben estar CHECK)

| # | Requisito | CHECK | Evidencia |
|---|---|---|---|
| 1 | SAST sin errores de seguridad | ☐ | `npm run lint:security` |
| 2 | SCA sin CVEs críticos | ☐ | `npm audit` |
| 3 | DAST score > 85% | ☐ | Reporte automatizado |
| 4 | Fuzz testing sin crashes (500) | ☐ | Reporte automatizado |
| 5 | Pentest completado (si aplica) | ☐ | REP-SEC-PENTEST-01 |
| 6 | 0 vulnerabilidades críticas abiertas | ☐ | Registro de vulnerabilidades |
| 7 | Secretos protegidos (no hardcodeados) | ☐ | Revisión de código |
| 8 | TLS habilitado | ☐ | `curl -I https://...` |
| 9 | JWT con expiry + refresh rotation | ☐ | Revisión de código |
| 10 | Rate limiting configurado | ☐ | `ab -n 100 -c 10` |
| 11 | Validación de inputs en todos los endpoints | ☐ | Revisión de código |
| 12 | Logging de auditoría habilitado | ☐ | `GET /api/audit` |
| 13 | CORS limitado a origen específico | ☐ | `curl -I -H "Origin: evil.com"` |
| 14 | Helmet security headers presentes | ☐ | `curl -I` |
| 15 | Aprobación de Security Lead | ☐ | Firma: ________ |

## 📊 Verificación Post-Release

| # | Verificación | CHECK |
|---|---|---|
| 1 | Health endpoint responde 200 | ☐ |
| 2 | Login funcional (admin) | ☐ |
| 3 | Frontend carga sin errores | ☐ |
| 4 | API responde endpoints protegidos | ☐ |
| 5 | Logs de auditoría se generan | ☐ |

## 🚨 Criterios de Bloqueo

**NO DESPLEGAR si:**
- ☐ Vulnerabilidades críticas (CVSS ≥ 9.0) sin parche
- ☐ Dependencias con CVEs críticos
- ☐ SAST con errores de seguridad
- ☐ Sin aprobación de Security Lead

---

**Firma Dev:** _________________ **Firma SecLead:** _________________
**Fecha:** _____________________
