# 📋 SDLC — Requisitos
## sprint-24-roadmap-autonomia

## Requisitos Funcionales

- **Dado** cualquier respuesta HTTP de Saturn, **cuando** se inspeccionan los headers, **entonces** incluye `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- **Dado** cualquier respuesta HTTP, **cuando** se inspeccionan, **entonces** incluye `X-XSS-Protection: 1; mode=block`
- **Dado** cualquier respuesta HTTP, **cuando** se inspeccionan, **entonces** incluye `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Dado** helmet() configurado, **cuando** se actualiza, **entonces** no rompe ninguna funcionalidad existente
- **Dado** el roadmap, **cuando** se documenta, **entonces** incluye 3 fases: Lite → Semi-Autónomo → Autónomo
- **Dado** el maturity model, **cuando** se define, **entonces** cubre niveles 0-5
- **Dado** la evaluación actual, **cuando** se documenta, **entonces** Saturn está en Nivel 1.5 con target Nivel 4+ para 2027
- **Dado** el análisis comparativo, **cuando** se completa, **entonces** compara Saturn con Dynatrace Davis, Datadog Watchdog, IBM Watsonx, NebulaOps y osModa

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
