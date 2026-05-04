# 🧪 SDLC — Pruebas
## sprint-21-security-audit

## Pruebas

| Test | Descripción | Resultado |
|---|---|---|
| Test lab | 4 contenedores Docker con SSH en puertos 2222-2225 | ✅ |
| SSH connect | Saturn se conecta a cada contenedor vía API | ✅ |
| Pentest batch | 150+ ataques ejecutados | ✅ |
| Bloqueo rate | 33/35 ataques bloqueados (94%) | ✅ |
| Reporte HTML | Reporte generado con hallazgos | ✅ |
| FINDING-001 | SQLi parcial documentado | ✅ |
| FINDING-002 | XSS almacenado documentado | ✅ |
| FINDING-003 | Sin límite de payload documentado | ✅ |
| FINDING-004 | Rate limit global documentado | ✅ |
| STRIDE model | 6 módulos, 17 amenazas | ✅ |

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
