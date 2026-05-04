# 🏃 Sprint 29 — Root Cause Analysis + Prophet Prediction

**Periodo:** 2026-05-04
**Objetivo:** Implementar análisis de causa raíz (RCA) con LLM + fallback determinista, y predicción de métricas con Prophet (Python) + fallback estadístico.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: POST /api/neural/rca — Root Cause Analysis
**Como** sistema de monitoreo,
**Quiero** un endpoint que analice incidentes y determine la causa raíz automáticamente,
**Para** acelerar la resolución de problemas.

**Criterios de Aceptación:**
- **Dado** un incidente con métricas y logs, **cuando** se envía a `POST /api/neural/rca`, **entonces** devuelve un análisis con causa raíz probable
- **Dado** el endpoint, **cuando** el LLM está disponible, **entonces** usa IA para el análisis
- **Dado** el endpoint, **cuando** el LLM no está disponible, **entonces** usa fallback determinista basado en reglas de thresholds
- **Dado** el análisis, **cuando** se completa, **entonces** incluye: causa, impacto, severidad y recomendación

### US-002: GET /api/neural/predict/:metric — Predicción con Prophet
**Como** operador,
**Quiero** predecir valores futuros de métricas usando Prophet,
**Para** anticipar problemas de capacidad antes de que ocurran.

**Criterios de Aceptación:**
- **Dado** una métrica (cpu/memory/disk), **cuando** se consulta `GET /api/neural/predict/:metric`, **entonces** devuelve predicciones para los próximos 60 minutos
- **Dado** el endpoint, **cuando** Prophet (Python) está disponible, **entonces** usa predicción con time-series forecasting
- **Dado** el endpoint, **cuando** Prophet no está disponible, **entonces** usa fallback estadístico basado en tendencia lineal

### US-003: Python prediction engine
**Como** sistema,
**Quiero** un motor de predicción en Python con Prophet,
**Para** generar forecasts precisos de series temporales.

**Criterios de Aceptación:**
- **Dado** `prediction-engine.py`, **cuando** recibe datos históricos, **entonces** entrena modelo Prophet y devuelve predicciones
- **Dado** el engine, **cuando** hay pocos datos (< 10 puntos), **entonces** devuelve fallback estadístico
- **Dado** el engine, **cuando** Prophet no está instalado, **entonces** falla gracefulmente y Node usa fallback

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| US planificadas | 3 |
| US completadas | 3 ✅ |
| Endpoints nuevos | 2 (RCA + Predict) |
| Motor Python | prediction-engine.py con Prophet |
| Fallback RCA | Determinista basado en thresholds |
| Fallback Predict | Tendencia estadística lineal |
| GitHub | `6a46add` |
