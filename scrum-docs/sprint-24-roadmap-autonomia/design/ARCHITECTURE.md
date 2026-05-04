# 🏗️ SDLC — Diseño
## sprint-24-roadmap-autonomia

## Contexto
Implementar security headers faltantes (P2-005 del Sprint 22) y documentar la estrategia de evolución hacia infraestructura autónoma.

## Security Headers (P2-005)
```
helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true },   // HTTP Strict Transport Security
  xssFilter: true,                                          // X-XSS-Protection
  crossOriginEmbedderPolicy: false,                         // Para compatibilidad
  contentSecurityPolicy: false                               // Se configura aparte si es necesario
})

// Permissions-Policy se agrega manualmente:
res.setHeader('Permissions-Policy', "camera=(), microphone=(), geolocation=()")
```

## Autonomous Infrastructure Maturity Model
| Nivel | Estado | Fase |
|---|---|---|
| 0 | Manual | — |
| 1 | Reactivo | Lite (hoy) |
| 2 | Preventivo | Lite |
| 3 | Proactivo | Semi-Autónomo |
| 4 | Predictivo | Target 2027 |
| 5 | Autónomo | Visión |

## Archivos involucrados
- `src/server.ts` — Configuración helmet
- `docs/roadmap-autonomo.md` — Roadmap detallado
- `docs/aiops-comparativa.md` — Análisis AIOps
