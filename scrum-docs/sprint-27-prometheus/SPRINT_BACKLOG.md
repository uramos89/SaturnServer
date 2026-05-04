# 🏃 Sprint 27 — Prometheus + Grafana Integrado

**Periodo:** 2026-05-03
**Objetivo:** Exponer métricas de Saturn en formato Prometheus, configurar scraping, y crear dashboard en Grafana. Documentar roadmap hacia Nivel 4+ de observabilidad.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Endpoint /api/metrics en formato Prometheus
**Como** operador,
**Quiero** un endpoint de métricas en formato Prometheus exposition,
**Para** que Prometheus pueda scrapear las métricas de Saturn.

**Criterios de Aceptación:**
- **Dado** el servidor corriendo, **cuando** se consulta `GET /api/metrics`, **entonces** responde en formato Prometheus exposition (`# HELP`, `# TYPE`, métricas con labels)
- **Dado** el endpoint, **cuando** se consulta, **entonces** incluye 9 métricas: servers, online, cpu, mem, disk, incidents, skills, users, audit
- **Dado** el endpoint, **cuando** hay servidores registrados, **entonces** cada servidor expone cpu/memory/disk con labels de hostname

### US-002: Prometheus scrape config
**Como** operador,
**Quiero** configurar Prometheus para scrapear Saturn,
**Para** recolectar métricas de forma continua.

**Criterios de Aceptación:**
- **Dado** Prometheus configurado, **cuando** se apunta a Saturn, **entonces** el target aparece como UP
- **Dado** el scraping activo, **cuando** pasan 15s, **entonces** Prometheus recolecta métricas correctamente

### US-003: Grafana dashboard
**Como** administrador,
**Quiero** un dashboard de Grafana con las métricas de Saturn,
**Para** visualizar el estado del sistema en tiempo real.

**Criterios de Aceptación:**
- **Dado** Grafana conectado a Prometheus, **cuando** se carga el dashboard, **entonces** muestra gauges de CPU, RAM y Disk
- **Dado** el dashboard, **cuando** hay servidores registrados, **entonces** muestra estadísticas agregadas

### US-004: Roadmap Nivel 4+
**Como** arquitecto,
**Quiero** documentar el roadmap de observabilidad hacia Nivel 4+,
**Para** guiar la evolución de Saturn.

**Criterios de Aceptación:**
- **Dado** el roadmap, **cuando** se documenta, **entonces** incluye 6 sprints: Observabilidad → ML → Auto-healing → SLA → Autónomo
- **Dado** la Fase 2, **cuando** se documenta, **entonces** describe evolución de Nivel 1.5 a 4+

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| US planificadas | 4 |
| US completadas | 4 ✅ |
| Métricas expuestas | 9 |
| Formato | Prometheus exposition |
| Prometheus target | UP ✅ |
| Grafana dashboard | Creado ✅ |
| GitHub | `34d34af`, `4555431` |
