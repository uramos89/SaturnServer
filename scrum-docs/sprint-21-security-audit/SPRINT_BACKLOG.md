# 🏃 Sprint 21 — Test Lab + Pentest Audit

**Periodo:** 2026-05-03
**Objetivo:** Crear laboratorio de pruebas con 4 contenedores Docker SSH, ejecutar auditoría destructiva E2E, y documentar hallazgos de pentest.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Test Lab Docker (4 contenedores SSH)
**Como** desarrollador,
**Quiero** un laboratorio de pruebas con contenedores Docker SSH,
**Para** probar la plataforma contra servidores reales sin afectar producción.

**Criterios de Aceptación:**
- **Dado** el script `create-lab.sh`, **cuando** se ejecuta, **entonces** crea 4 contenedores Docker: web01, db01, load01, monitor01
- **Dado** los contenedores, **cuando** están activos, **entonces** cada uno expone SSH en puertos 2222-2225
- **Dado** los contenedores, **cuando** se conecta vía SSH, **entonces** cada uno tiene servicios falsos (nginx, mysql, haproxy, prometheus, node_exporter)

### US-002: Pentest militar (150+ ataques)
**Como** equipo de seguridad,
**Quiero** ejecutar una batería de 150+ ataques contra la API de Saturn,
**Para** identificar vulnerabilidades reales.

**Criterios de Aceptación:**
- **Dado** el runner de pentest, **cuando** se ejecuta, **entonces** realiza 150+ ataques documentados
- **Dado** el pentest, **cuando** se completa, **entonces** genera reporte HTML con resultados
- **Dado** el reporte, **cuando** se genera, **entonces** incluye hallazgos y puntuación de seguridad

### US-003: Auditoría E2E con audit-runner.js
**Como** desarrollador,
**Quiero** un script de auditoría E2E que valide toda la plataforma desde la API,
**Para** detectar regresiones y problemas de integración.

**Criterios de Aceptación:**
- **Dado** `audit-runner.js`, **cuando** se ejecuta, **entonces** valúa login, servidores, skills, notificaciones
- **Dado** el runner, **cuando** se completa, **entonces** reporta resultados detallados

### US-004: STRIDE threat model (6 módulos, 17 amenazas)
**Como** arquitecto,
**Quiero** documentar el modelo STRIDE con hallazgos específicos,
**Para** priorizar la remediación.

**Criterios de Aceptación:**
- **Dado** el threat model, **cuando** se documenta, **entonces** cubre 6 módulos con 17 amenazas
- **Dado** las amenazas, **cuando** se documentan, **entonces** incluyen FINDING-001 a FINDING-004

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| US planificadas | 4 |
| US completadas | 4 ✅ |
| Contenedores SSH | 4 (web01, db01, load01, monitor01) |
| Ataques ejecutados | 150+ |
| Ataques bloqueados | 33/35 (94%) |
| Hallazgos FINDING | 4 (001-004) |
| Módulos STRIDE | 6 |
| Amenazas STRIDE | 17 |
| GitHub | `eb66478`, `02c8422`, `eef883a`, `1e4014e` |
