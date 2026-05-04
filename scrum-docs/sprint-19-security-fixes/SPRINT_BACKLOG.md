# 🏃 Sprint 19 — DAST + Fuzz + Threat Model STRIDE

**Periodo:** 2026-05-03
**Objetivo:** Realizar DAST (Dynamic Application Security Testing) y Fuzz testing sobre la API, documentar el Threat Model STRIDE, y asegurar cobertura de ataques comunes.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Threat Model STRIDE
**Como** arquitecto de seguridad,
**Quiero** documentar el modelo de amenazas STRIDE para Saturn,
**Para** identificar y mitigar riesgos de forma sistemática.

**Criterios de Aceptación:**
- **Dado** el modelo STRIDE, **cuando** se documenta, **entonces** cubre 6 módulos: Auth, SSH, AI, Skills, Notifications, Frontend
- **Dado** el threat model, **cuando** se completa, **entonces** incluye 17 amenazas documentadas con mitigaciones
- **Dado** cada amenaza, **cuando** se registra, **entonces** incluye categoría STRIDE, descripción, impacto y mitigación propuesta

### US-002: Fuzz Testing (45+ casos)
**Como** sistema de seguridad,
**Quiero** ejecutar fuzz testing automatizado contra la API,
**Para** detectar vulnerabilidades por entrada malformada.

**Criterios de Aceptación:**
- **Dado** el fuzzer, **cuando** se ejecuta, **entonces** prueba 45+ casos con payloads malformados
- **Dado** un payload SQLi, **cuando** se envía, **entonces** la API no devuelve error 500
- **Dado** un payload XSS, **cuando** se envía, **entonces** la API no refleja el script sin sanitizar
- **Dado** path traversal, **cuando** se envía, **entonces** la API lo rechaza
- **Dado** null bytes, arrays, large bodies, **cuando** se envían, **entonces** la API maneja el error gracefulmente

### US-003: Cobertura de vectores de ataque
**Como** equipo de seguridad,
**Quiero** validar cobertura contra SQLi, XSS, path traversal, null, arrays y large bodies,
**Para** asegurar que no hay brechas en la protección.

**Criterios de Aceptación:**
- **Dado** la suite de fuzz, **cuando** se ejecuta, **entonces** incluye tests para SQLi, XSS, path traversal
- **Dado** la suite de fuzz, **cuando** se ejecuta, **entonces** incluye tests para null, arrays, large bodies
- **Dado** cualquier test que produce error 500, **cuando** se revisa, **entonces** se documenta como finding

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| US planificadas | 3 |
| US completadas | 3 ✅ |
| Módulos STRIDE | 6 |
| Amenazas STRIDE | 17 |
| Casos de fuzz | 45+ |
| Vectores cubiertos | SQLi, XSS, path traversal, null, arrays, large bodies |
| GitHub | `ec789c9`, `e824af5`, `902fd6f` |
| Producción | Health 200 ✅ |
