# PRO-SEC-TESTING-01 — Procedimiento de Testing de Seguridad

**Versión:** 1.0 | **Clasificación:** CONFIDENCIAL

## 1. Propósito
Estandarizar las pruebas de seguridad que todo release de Saturn Server debe superar.

## 2. Frecuencia
| Tipo | Frecuencia | Responsable |
|---|---|---|
| SAST | Cada commit/PR | DevSecOps |
| SCA | Cada release | DevSecOps |
| DAST | Cada release (staging) | QA |
| Fuzz | Semanal | QA |
| Pentest | Releases críticos | Security Lead + Externo |

## 3. Procedimiento SAST

```bash
# 1. Ejecutar linter de seguridad
npm run lint:security

# 2. Verificar 0 errores de seguridad
# 3. Si hay errores → bloquear PR hasta corrección
```

## 4. Procedimiento SCA

```bash
# 1. Ejecutar auditoría de dependencias
npm audit

# 2. Verificar:
#   - 0 vulnerabilidades críticas
#   - 0 vulnerabilidades altas
# 3. Si hay CVEs críticos → bloquear release
```

## 5. Procedimiento DAST

```bash
# 1. Ejecutar suite automatizada
python3 saturn-audit/compliance/scripts/saturn-security-suite.py

# 2. Verificar:
#   - Score > 85%
#   - 0 hallazgos críticos nuevos
```

## 6. Criterios de Aprobación

| Prueba | Criterio | Acción si falla |
|---|---|---|
| SAST | 0 errores de seguridad | Bloquear PR |
| SCA | 0 CVEs críticos | Bloquear release |
| DAST | Score > 85% | Revisión de hallazgos |
| Fuzz | 0 crashes (500) | Corregir antes de release |
| Pentest | 0 críticos + GO Security Lead | Rechazar release |
