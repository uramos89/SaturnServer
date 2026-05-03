# POL-SEC-SSDLC-01 — Política de Seguridad en el Ciclo de Vida del Desarrollo

**Versión:** 1.0 | **Fecha:** 2026-05-03 | **Clasificación:** CONFIDENCIAL

## 1. Propósito
Establecer los requisitos mínimos de seguridad que todo release de Saturn Server debe cumplir antes de ser desplegado en producción.

## 2. Alcance
Aplica a todo el código fuente, dependencias, configuración e infraestructura de Saturn Server.

## 3. Roles y Responsabilidades

| Rol | Responsabilidad |
|---|---|
| **Dev** | Implementar código seguro, corregir hallazgos SAST/SCA |
| **QA** | Ejecutar pruebas de seguridad funcionales, reportar anomalías |
| **Security Lead** | Aprobar/rechazar releases, definir thresholds de riesgo |
| **DevSecOps** | Mantener pipeline CI/CD, automatizar pruebas de seguridad |

## 4. Fases SSDLC Obligatorias

### 4.1 Diseño
- Threat Modeling (STRIDE) por módulo
- Clasificación de datos manejados
- Definición de controles de seguridad

### 4.2 Desarrollo
- Code Review seguro (mínimo 1 senior por PR)
- SAST automatizado (eslint-plugin-security)
- SCA automatizado (npm audit)

### 4.3 Testing
- DAST contra staging
- Fuzz testing de endpoints
- Pentest completo en releases críticos
- Validación OWASP Top 10

### 4.4 Despliegue (Security Gate)
**NO se despliega si:**
- ❌ Vulnerabilidades críticas (CVSS ≥ 9.0) sin parche
- ❌ Dependencias con CVEs críticos conocidos
- ❌ SAST con errores de seguridad sin resolver
- ❌ Sin aprobación del Security Lead

## 5. Niveles de Severidad (CVSS v3.1)

| Severidad | Score | Acción | SLA |
|---|---|---|---|
| Crítico | 9.0-10.0 | Bloquea release | 24h |
| Alto | 7.0-8.9 | Parche obligatorio | 72h |
| Medio | 4.0-6.9 | Planificar corrección | 2 semanas |
| Bajo | 0.1-3.9 | Documentar | 1 mes |

## 6. KPIs de Seguridad

| Métrica | Target |
|---|---|
| Vulnerabilidades por release | < 3 |
| Tiempo de remediación (MTTR) | < 48h |
| Cobertura de pruebas de seguridad | > 80% |
| Cumplimiento OWASP Top 10 | 100% |
