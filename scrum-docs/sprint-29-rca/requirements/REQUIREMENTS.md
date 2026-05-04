# 📋 SDLC — Requisitos
## sprint-29-rca

## Requisitos Funcionales

- **Dado** un incidente con métricas y logs, **cuando** se envía a `POST /api/neural/rca`, **entonces** devuelve un análisis con causa raíz probable
- **Dado** el endpoint RCA, **cuando** el LLM está disponible, **entonces** usa IA para el análisis
- **Dado** el endpoint RCA, **cuando** el LLM no está disponible, **entonces** usa fallback determinista basado en reglas de thresholds
- **Dado** el análisis RCA, **cuando** se completa, **entonces** incluye: causa, impacto, severidad y recomendación
- **Dado** una métrica (cpu/memory/disk), **cuando** se consulta `GET /api/neural/predict/:metric`, **entonces** devuelve predicciones para los próximos 60 minutos
- **Dado** el predict endpoint, **cuando** Prophet está disponible, **entonces** usa time-series forecasting
- **Dado** el predict endpoint, **cuando** Prophet no está disponible, **entonces** usa fallback estadístico basado en tendencia lineal
- **Dado** `prediction-engine.py`, **cuando** recibe datos históricos, **entonces** entrena modelo Prophet
- **Dado** el engine, **cuando** hay pocos datos, **entonces** devuelve fallback estadístico

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
