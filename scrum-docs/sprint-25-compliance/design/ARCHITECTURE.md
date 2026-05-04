# 🏗️ SDLC — Diseño
## sprint-25-compliance

## Contexto
Implementar marco de cumplimiento normativo completo alineado con ISO 27001, NIST 800-53 y OWASP.

## Estructura del Framework
```
compliance/
├── POL-SEC-SSDLC-01.md        ← Política de desarrollo seguro
├── PRO-SEC-TESTING-01.md       ← Procedimiento de testing
├── PRO-SEC-PENTEST-01.md       ← Procedimiento de pentesting (PTES)
├── CHK-SEC-RELEASE-01.md       ← Checklist de release
├── REG-SEC-VULN-01.md          ← Registro de vulnerabilidades
└── REP-SEC-PENTEST-01.md       ← Reporte profesional

SATURN SECURITY SUITE v1.0 (Python)
├── sast_scan.py
├── sca_scan.py
├── dast_runner.py
├── fuzz_runner.py
└── pentest_runner.py
```

## Security Gate
```
GO:
  - 0 CVEs críticos
  - 0 secrets expuestos
  - TLS activo
  - SAST pasa con 0 high

NO-GO si:
  - CVE crítico activo
  - Secretos en código
  - Sin TLS
  - SAST high > 0
```

## Mapeo de Compliance
| Saturn Feature | NIST 800-53 | ISO 27001 | OWASP | MITRE |
|---|---|---|---|---|
| Auth JWT + bcrypt | AC-2, IA-5 | A.9.2.1 | A2 | T1078 |
| TLS | SC-8, SC-13 | A.13.2.1 | A3 | — |
| Audit logs | AU-2, AU-3 | A.12.4.1 | A10 | T1070 |
| SAST/SCA | SA-11, SA-15 | A.14.2.1 | — | — |

## Archivos involucrados
- `compliance/` — Documentos del framework
- `scripts/security-suite/` — Suite Python
- `src/middleware/security-gate.ts` — Gate checks
