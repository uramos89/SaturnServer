# 🏗️ SDLC — Diseño
## sprint-29-rca

## Contexto
Añadir capacidades de análisis predictivo y de causa raíz al Neural Engine de Saturn.

## Arquitectura RCA
```
POST /api/neural/rca
  ├─ Body: { serverId, metric, value, threshold, logs?, context }
  ├─ Intentar LLM (Gemini)
  │   └─ Éxito → devuelve análisis con IA
  └─ Fallback determinista
      ├─ CPU > 90% → "Alta carga de CPU. Posibles causas: procesos intensivos..."
      ├─ Mem > 90% → "Alta utilización de memoria. Posibles causas: memory leak..."
      └─ Disk > 90% → "Poco espacio en disco. Posibles causas: logs acumulados..."
```

## Arquitectura Predicción
```
GET /api/neural/predict/:metric
  ├─ Obtener datos históricos de :metric (60+ puntos)
  ├─ Intentar Python prediction-engine.py (Prophet)
  │   ├─ Éxito → devuelve forecast 60 min
  │   └─ Error / timeout → fallback
  └─ Fallback estadístico
      └─ Tendencia lineal basada en últimos N valores
```

## Python Engine (prediction-engine.py)
```
Input: JSON con valores históricos [{ timestamp, value }, ...]
Process: Prophet(time_series)
  ├─ fit(historical)
  ├─ make_future_dataframe(periods=60)
  └─ predict()
Output: JSON con [{ timestamp, value, lower_bound, upper_bound }, ...]
```

## Archivos involucrados
- `src/routes/neural.ts` — Endpoints RCA y Predict
- `python/prediction-engine.py` — Motor Prophet
- `src/lib/neural-fallback.ts` — Fallbacks determinista y estadístico
