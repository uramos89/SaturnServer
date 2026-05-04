# 🧬 FASE 2 — Evolución a Infraestructura Autónoma (Nivel 4+)

**Período:** 2026-05-03 → 2027
**Estado actual:** Nivel 1.5 (Automatizado con supervisión parcial)
**Target:** Nivel 4+ (Autónomo con SLA-driven management)

---

## 📚 Investigación de Tecnologías Requeridas

### Stack de Observabilidad

| Tecnología | Propósito | Requisitos | Alternativas |
|---|---|---|---|
| **Prometheus** | Métricas + alerting | Time-series DB, service discovery | VictoriaMetrics, Thanos |
| **Grafana** | Dashboard + visualización | Data source plugin, alerting | Kibana, Netdata |
| **Node Exporter** | Métricas del sistema Linux | System metrics (CPU/RAM/Disk) | Telegraf, collected |
| **cAdvisor** | Métricas de contenedores Docker | Container metrics | — |
| **Alertmanager** | Manejo de alertas Prometheus | Routing, inhibition, silences | — |

### Stack de ML / Anomaly Detection

| Tecnología | Propósito | Requisitos |
|---|---|---|
| **Prophet (Meta)** | Time-series forecasting | Python, detecta anomalías estacionales |
| **scikit-learn** | ML clásico (IsolationForest) | Detección de outliers en métricas |
| **PyOD** | Outlier detection toolkit | 40+ algoritmos de detección |
| **Prometheus ML** | ML sobre datos de Prometheus | Custom adapter |
| **Loki** | Log aggregation para análisis | Log-based anomaly detection |

### Stack de Auto-Healing Avanzado

| Tecnología | Propósito |
|---|---|
| **Kubernetes Operator** | Self-healing nativo de k8s (pods, deployments) |
| **Docker Compose** | Orquestación simple multi-contenedor |
| **Systemd Units** | Gestión de servicios a nivel OS |
| **Salt Reactor** | Event-driven remediation (referencia) |

### Stack de Integración Multi-Cloud

| Tecnología | Propósito |
|---|---|
| **Terraform / OpenTofu** | IaC multi-cloud |
| **Crossplane** | Control plane multi-cloud nativo k8s |
| **Pulumi** | IaC con lenguajes de programación |

---

## 📋 Plan de Sprints — Roadmap Nivel 4+

### 🏃 Sprint 27: Prometheus + Grafana Core
**Esfuerzo:** 1 semana | **Dependencias:** Ninguna

| US | Título | Criterios de Aceptación |
|---|---|---|
| US-001 | Instalar Prometheus + Node Exporter | `curl localhost:9090` responde, métricas del sistema visibles |
| US-002 | Configurar Grafana + datasource Prometheus | `curl localhost:3001` responde, dashboards cargan |
| US-003 | Dashboard de Saturn Metrics | CPU/RAM/Disk por servidor desde Prometheus |
| US-004 | Alertmanager + email/webhook | Alertas configuradas, notificaciones llegan |

### 🏃 Sprint 28: ML Anomaly Detection
**Esfuerzo:** 2 semanas | **Dependencias:** Sprint 27

| US | Título | Criterios de Aceptación |
|---|---|---|
| US-005 | Motor de anomalías estadísticas | Desviación estándar + percentiles configurable |
| US-006 | Detección de outliers con IsolationForest | API `/api/neural/anomaly` devuelve anomalías detectadas |
| US-007 | Dashboard de anomalías en Grafana | Paneles con anomalías marcadas en time-series |
| US-008 | Alertas inteligentes (no solo thresholds) | Alertas solo cuando es anomalía real, no pico normal |

### 🏃 Sprint 29: Causa Raíz + Predicción
**Esfuerzo:** 2 semanas | **Dependencias:** Sprint 28

| US | Título | Criterios de Aceptación |
|---|---|---|
| US-009 | Root Cause Analysis con LLM | ARES analiza métricas + logs y emite causa raíz |
| US-010 | Predicción de fallas (Prophet) | API predice CPU/RAM/Disk a 1h vista |
| US-011 | Dashboard predictivo | Líneas de predicción + bandas de confianza en Grafana |

### 🏃 Sprint 30: Auto-Healing Supervisado
**Esfuerzo:** 2 semanas | **Dependencias:** Sprint 29

| US | Título | Criterios de Aceptación |
|---|---|---|
| US-012 | Auto-healing de servicios comunes | ARES reinicia servicios caídos automáticamente |
| US-013 | Modo supervisado vs autónomo | Configurable por servicio/tag |
| US-014 | Notificaciones de acciones autónomas | Canal de notificación para cada acción ejecutada |

### 🏃 Sprint 31: SLA-Driven Management
**Esfuerzo:** 3 semanas | **Dependencias:** Sprint 30

| US | Título | Criterios de Aceptación |
|---|---|---|
| US-015 | Definición de SLAs configurables | `{ cpu < 80%, uptime > 99.9% }` por servidor |
| US-016 | Motor SLA | Monitoreo continuo + alertas si SLA se viola |
| US-017 | Remediation basada en SLA | `SLA violado → ARES decide acción automática` |
| US-018 | Reporte mensual de cumplimiento SLA | PDF/HTML generado automáticamente |

### 🏃 Sprint 32: Webhooks + Integración Continua
**Esfuerzo:** 1 semana | **Dependencias:** Sprint 31

| US | Título | Criterios de Aceptación |
|---|---|---|
| US-019 | Webhooks entrantes | GitHub, PagerDuty, Slack → disparan acciones |
| US-020 | API Pública documentada | OpenAPI 3.0 en `/api/docs` |
| US-021 | Catálogo de skills extensible | `SKILLS/_templates/` con documentación |

---

## 📊 Resumen de Esfuerzo

| Sprint | Título | Sprints | Semanas |
|---|---|---|---|
| 27 | Prometheus + Grafana | 1 | 1 |
| 28 | ML Anomaly Detection | 1 | 2 |
| 29 | Causa Raíz + Predicción | 1 | 2 |
| 30 | Auto-Healing Supervisado | 1 | 2 |
| 31 | SLA-Driven Management | 1 | 3 |
| 32 | Webhooks + Integración | 1 | 1 |
| **Total** | **Nivel 4+** | **6 sprints** | **~11 semanas** |

---

## 📈 Progresión de Madurez

```
Sprint 27 ──→ Prometheus + Grafana         → Nivel 2 (Observabilidad)
Sprint 28 ──→ ML Anomaly Detection         → Nivel 2.5 (ML básico)
Sprint 29 ──→ Causa Raíz + Predicción      → Nivel 3 (Semi-autónomo)
Sprint 30 ──→ Auto-Healing Supervisado     → Nivel 3.5 (Auto-healing)
Sprint 31 ──→ SLA-Driven Management        → Nivel 4 (Autónomo)
Sprint 32 ──→ Webhooks + API               → Nivel 4+ (Integrado)
```
