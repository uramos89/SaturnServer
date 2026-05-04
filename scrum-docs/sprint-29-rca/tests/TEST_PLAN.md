# 🧪 SDLC — Pruebas
## sprint-29-rca

## Pruebas RCA

| Test | Descripción | Resultado |
|---|---|---|
| RCA con LLM | POST /api/neural/rca con datos → respuesta con causa raíz | ✅ |
| RCA fallback | Sin LLM → respuesta determinista | ✅ |
| RCA formato | Respuesta incluye causa, impacto, severidad, recomendación | ✅ |

## Pruebas Predicción

| Test | Descripción | Resultado |
|---|---|---|
| Predict con Prophet | GET /api/neural/predict/cpu → forecast 60 min | ✅ |
| Predict fallback | Sin Prophet → tendencia estadística | ✅ |
| Predict edge case | Pocos datos → fallback graceful | ✅ |
| Python engine | prediction-engine.py con datos históricos → forecast | ✅ |

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
