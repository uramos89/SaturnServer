# 🏃 Sprint 17 — Security Hardening (SAST + SCA + TLS)

**Periodo:** 2026-05-03
**Objetivo:** Integrar seguridad en el SDLC con SAST, SCA, TLS y DevSecOps gates.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: eslint-plugin-security + sonarjs
**Como** desarrollador,
**Quiero** reglas de seguridad en el linter,
**Para** detectar vulnerabilidades en tiempo de escritura.

**Criterios de Aceptación:**
- **Dado** `eslint-plugin-security` instalado, **cuando** se ejecuta `npm run lint:security`, **entonces** analiza el código con reglas como `security/detect-object-injection`
- **Dado** `eslint-plugin-sonarjs` instalado, **cuando** se ejecuta el linter, **entonces** detecta code smells y bugs
- **Dado** código con `eval()`, **cuando** pasa por el linter, **entonces** lo marca como error de seguridad

### US-002: npm audit en pipeline
**Como** sistema,
**Quiero** que `install.sh` ejecute `npm audit` automáticamente,
**Para** detectar dependencias vulnerables antes del despliegue.

**Criterios de Aceptación:**
- **Dado** `install.sh`, **cuando** se ejecuta, **entonces** corre `npm audit` después de `npm install`
- **Dado** vulnerabilidades críticas, **cuando** se detectan, **entonces** muestra advertencia en la salida
- **Dado** sin vulnerabilidades críticas, **cuando** se completa, **entonces** muestra "No critical vulnerabilities"

### US-003: TLS auto-firmado en install.sh
**Como** administrador,
**Quiero** que `install.sh` genere un certificado TLS,
**Para** que Saturn sirva contenido cifrado por defecto.

**Criterios de Aceptación:**
- **Dado** `install.sh`, **cuando** se ejecuta, **entonces** genera un certificado TLS auto-firmado en `ssl/server.crt`
- **Dado** el certificado generado, **cuando** se completa, **entonces** escribe `TLS_CERT` y `TLS_KEY` en `.env`
- **Dado** un certificado existente, **cuando** se ejecuta de nuevo, **entonces** no lo sobrescribe

### US-004: Security scripts en package.json
**Como** desarrollador,
**Quiero** scripts npm para auditoría de seguridad,
**Para** ejecutarlos manualmente o en CI.

**Criterios de Aceptación:**
- **Dado** `package.json`, **cuando** se ejecuta `npm run lint:security`, **entonces** corre eslint con reglas de seguridad
- **Dado** `package.json`, **cuando** se ejecuta `npm run audit`, **entonces** corre `npm audit`

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| US planificadas | 4 |
| US completadas | 4 ✅ |
| Paquetes añadidos | eslint-plugin-security, eslint-plugin-sonarjs |
| Archivos modificados | install.sh, .eslintrc.json, package.json |
| GitHub | `1d540fe` |
| Producción | Health 200 ✅ |

## Resumen SSDLC

El SDLC ahora incluye seguridad en cada fase:

```
Requirements ─→ Design ─→ [Threat Model] ─→ Implement ─→ [SAST] ─→ Tests ─→ [SCA] ─→ Deploy ─→ [TLS]
```
