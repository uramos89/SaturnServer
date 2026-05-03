# 🏃 Sprint 2 — Planning

> **Fecha de planning:** 2026-05-03
> **Duración propuesta:** 7 días
> **Sprint Goal:** Construir el Proactive Executor y sistema de detección de incidentes

---

## 🎯 Sprint Goal

Que el ARES Worker ejecute automáticamente las actividades proactivas según su schedule y condición, y que detecte incidentes por thresholds de servidor.

---

## 📋 Backlog Propuesto

| ID | Título | Prioridad | Esfuerzo | Dependencias |
|---|---|---|---|---|
| US-017 | Proactive Executor: worker que ejecute actividades según schedule | 🔥 Alta | 8 | Ninguna |
| US-018 | Evaluación de condiciones antes de ejecutar (cpu, disk, memory) | 🔥 Alta | 5 | US-017 |
| US-019 | Historial de ejecuciones de actividades proactivas | 🟡 Media | 3 | US-017 |
| US-020 | Pausar/reanudar actividad proactiva | 🟡 Media | 2 | Ninguna |
| US-021 | Notificaciones cuando una actividad falle | 🟡 Media | 3 | US-017 |
| US-022 | Detección automática de incidentes por thresholds | 🔥 Alta | 8 | Ninguna |

---

## 🏗️ Arquitectura Propuesta

```
ARES Worker (cada 60s)
  ├── processProactiveActivities()
  │   ├── Leer actividades con enabled=1
  │   ├── Evaluar schedule (cron o intervalo)
  │   ├── Evaluar condición contra servidor (SSH)
  │   ├── Ejecutar skill si condición se cumple
  │   └── Registrar resultado en history table
  │
  ├── processThresholds()
  │   ├── Leer thresholds configurados
  │   ├── Obtener métricas de servidores
  │   ├── Comparar contra thresholds
  │   └── Crear incident si se supera
  │
  └── processIncidents() (existente)
```

---

## 📊 Estimación

| Métrica | Valor |
|---|---|
| Story Points totales | 29 |
| Días estimados | 5-7 |
| Riesgo | Medio (depende de pruebas con servidores reales) |
