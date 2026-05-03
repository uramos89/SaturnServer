# 📋 SDLC — Requisitos
## sprint-4

## Requisitos Funcionales

- | Item | US ID | Tipo | Prioridad | Esfuerzo | Estado | Notas |
- |---|---|---|---|---|---|---|
- | SSM Command Execution | US-026 | Feature | 🔥 Alta | 8 | ✅ Done | `POST /api/cloud/ssm-exec` ejecuta comandos sin SSH |
- | List SSM-managed instances | US-027 | Feature | 🔥 Alta | 3 | ✅ Done | `POST /api/cloud/ssm-instances` lista instancias con SSM Agent |
- | SSM Service modular | — | Feature | 🟡 Media | 5 | ✅ Done | `src/services/ssm-service.ts` |
- | Identity Proxy (Bastión) | US-028 | Feature | 🔥 Alta | 5 | ✅ Done | `src/services/bastion-service.ts` (existente + endpoints) |
- | Auto-poblado de servidores desde cloud | US-029 | Feature | 🟡 Media | 5 | ✅ Done | Cloud scan → INSERT OR IGNORE en servers |
- | Endpoint | Método | Descripción |
- |---|---|---|
- | `/api/cloud/ssm-exec` | POST | Ejecutar comando en EC2 via SSM (sin SSH) |
- | `/api/cloud/ssm-instances` | POST | Listar instancias con SSM Agent |
- | Endpoint | Método | Descripción | Provider |
- |---|---|---|---|
- | `/api/cloud/scan` | POST | Descubrir instancias de nube y poblarlas en servers | AWS EC2, GCP, Azure |
- | `/api/cloud/scan` | — | Inserta discovered instances en tabla `servers` con tags `provider,region` | — |

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
