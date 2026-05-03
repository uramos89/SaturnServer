# 🏃 Sprint 15 — Producción, Deuda Técnica y ContextP

**Periodo:** 2026-05-03
**Objetivo:** Desplegar build funcional en producción, resolver el error "api is not defined", y establecer el ciclo perpetuo Dev→Audit→Doc→Git→Deploy

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Build y deploy nuevo dist/ a .134
**Como** desarrollador,
**Quiero** construir y desplegar el build actualizado a producción,
**Para** que los fixes lleguen al servidor vivo.

**Criterios de Aceptación:**
- **Dado** el código actualizado en `.133`, **cuando** se ejecuta `npm run build`, **entonces** se genera `dist/` sin errores
- **Dado** el build nuevo, **cuando** se copia a `.134:/home/ubuntu/saturn/dist/`, **entonces** reemplaza todos los archivos anteriores

### US-002: Restart PM2 con nuevo build
**Como** desarrollador,
**Quiero** reiniciar Saturn con el nuevo build,
**Para** que los cambios tomen efecto.

**Criterios de Aceptación:**
- **Dado** el nuevo build en `.134`, **cuando** se ejecuta `pm2 restart saturn`, **entonces** el proceso se reinicia sin errores
- **Dado** el reinicio, **cuando** se consulta `GET /api/health`, **entonces** responde HTTP 200
- **Dado** el reinicio, **cuando** se consulta `GET /`, **entonces** responde HTTP 200 (frontend)

### US-003: Configurar GitHub remote con PAT
**Como** desarrollador,
**Quiero** configurar el remote de GitHub con autenticación,
**Para** poder pushear código automáticamente.

**Criterios de Aceptación:**
- **Dado** un PAT válido, **cuando** se configura en el remote de origin, **entonces** `git push origin main` funciona sin prompts

### US-004: Push código actual a GitHub
**Como** desarrollador,
**Quiero** subir el código actual a GitHub,
**Para** tener respaldo y control de versiones.

**Criterios de Aceptación:**
- **Dado** cambios locales sin commit, **cuando** se ejecuta `git push`, **entonces** todos los cambios se suben al remoto
- **Dado** el push completado, **cuando** se visita el repo en GitHub, **entonces** los commits nuevos aparecen en `main`

### US-005: Auditoría inicial de código
**Como** desarrollador,
**Quiero** auditar el código base para identificar deuda técnica,
**Para** planificar correcciones.

**Criterios de Aceptación:**
- **Dado** el código fuente, **cuando** se auditan las primeras 2,700 líneas, **entonces** se documentan hallazgos en `saturn-audit/reports/`
- **Dado** la auditoría, **cuando** se completa, **entonces** incluye: funcionalidades correctas, deuda técnica detectada y pendientes del README

### US-006: Firmar CONTRACT.md
**Como** Alicia,
**Quiero** formalizar el contrato con Ulises,
**Para** definir las reglas de nuestra relación de trabajo.

**Criterios de Aceptación:**
- **Dado** los 18 puntos del contrato, **cuando** se documentan en `CONTRACT.md`, **entonces** todas las reglas están escritas explícitamente

### US-007: Leer paper ContextP
**Como** Alicia,
**Quiero** leer y entender el paper de ContextP,
**Para** alinear el desarrollo con la visión de memoria contextual parametrizada.

**Criterios de Aceptación:**
- **Dado** el paper de ContextP, **cuando** se lee, **entonces** se entienden los conceptos: OBPA, contratos, memoria organizacional, cpini.md
- **Dado** el entendimiento de ContextP, **cuando** se desarrolla, **entonces** las decisiones se alinean con los contratos

### US-008: Instalar OCR en ALICIA
**Como** Alicia,
**Quiero** tener OCR instalado,
**Para** poder leer screenshots y documentos que Ulises me envía.

**Criterios de Aceptación:**
- **Dado** `tesseract-ocr` instalado, **cuando** se ejecuta `tesseract imagen.jpg stdout`, **entonces** extrae texto de la imagen

### US-009: Verificar fix "api is not defined"
**Como** desarrollador,
**Quiero** verificar que el error "api is not defined" está corregido,
**Para** que el frontend funcione correctamente.

**Criterios de Aceptación:**
- **Dado** el código actualizado en `src/App.tsx`, **cuando** se importa `api` desde `./lib/utils`, **entonces** el import existe y es correcto
- **Dado** el build desplegado, **cuando** un usuario hace clic en "Adopt New Node" e ingresa datos, **entonces** la llamada a `api()` se ejecuta sin error "api is not defined"

### US-010: Agregar acceptance criteria a sprints 5-14
**Como** desarrollador,
**Quiero** que todas las historias de usuario tengan criterios de aceptación,
**Para** que cada US tenga una definición clara de "done".

**Criterios de Aceptación:**
- **Dado** los sprints 5 al 14, **cuando** se revisan, **entonces** cada US tiene criterios de aceptación en formato Given/When/Then
- **Dado** los criterios de aceptación, **cuando** se escriben, **entonces** se basan en lo que la plataforma promete hacer

### US-011: Agregar Gemini API Key (bloqueado)
**Como** sistema,
**Quiero** tener una API Key de Gemini configurada,
**Para** que ARES pueda usar IA en la resolución de incidentes.

**Criterios de Aceptación:**
- ⚠️ **BLOQUEADO:** Pendiente de que Ulises proporcione la key
- **Dado** una key válida en `.env`, **cuando** ARES necesita IA, **entonces** puede invocar Gemini correctamente

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Items planificados | 11 |
| ✅ Completados | 9 |
| 🔄 En progreso | 1 (US-010) |
| ⚠️ Bloqueados | 1 (US-011) |

---

## 🔍 Hallazgos de esta iteración

1. **Build desactualizado** — Producción corría build de hace días con bugs ya corregidos
2. **"api is not defined"** — Causado por versión vieja donde `api` no se exportaba de `utils.ts`
3. **DB reseteada** — Al reiniciar se perdió la DB anterior (solución: backup antes de deploy)
4. **Sin Gemini Key** — ARES no puede usar IA, incidentes quedan en "manual review"
5. **Sprint 14 incompleto** — US-001 funciona, pero US-002/003/004 (auto-generación ARES) no están implementados
6. **OCR instalado** — tesseract-ocr + español listo

---

## ⚠️ Bloqueos
- ❌ Gemini API Key — solicitar a Ulises
