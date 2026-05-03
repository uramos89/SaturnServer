# 🏃 Sprint 4 — Cloud Connectors & Auto-Discovery

> **Feature Reference:** EP-01 (Cloud Connectors), EP-12 (Identity Proxy)
> **Estado:** En progreso

---

## 📋 Items del Sprint

| Item | US ID | Tipo | Prioridad | Esfuerzo | Estado | Notas |
|---|---|---|---|---|---|---|
| SSM Command Execution | US-026 | Feature | 🔥 Alta | 8 | ✅ Done | `POST /api/cloud/ssm-exec` ejecuta comandos sin SSH |
| List SSM-managed instances | US-027 | Feature | 🔥 Alta | 3 | ✅ Done | `POST /api/cloud/ssm-instances` lista instancias con SSM Agent |
| SSM Service modular | — | Feature | 🟡 Media | 5 | ✅ Done | `src/services/ssm-service.ts` |
| Identity Proxy (Bastión) | US-028 | Feature | 🔥 Alta | 5 | ✅ Done | `src/services/bastion-service.ts` (existente + endpoints) |
| Auto-poblado de servidores desde cloud | US-029 | Feature | 🟡 Media | 5 | ✅ Done | Cloud scan → INSERT OR IGNORE en servers |

---

## 📦 Nuevos archivos

```
src/services/ssm-service.ts  ← AWS SSM service
  - ssmExecCommand(config, instanceId, command, timeout) → { commandId, status, stdout, stderr }
  - ssmListInstances(config) → [{ instanceId, name, os, pingStatus }]
```

## 📦 Nuevos endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/cloud/ssm-exec` | POST | Ejecutar comando en EC2 via SSM (sin SSH) |
| `/api/cloud/ssm-instances` | POST | Listar instancias con SSM Agent |

## 📦 Endpoints existentes mejorados

| Endpoint | Método | Descripción | Provider |
|---|---|---|---|
| `/api/cloud/scan` | POST | Descubrir instancias de nube y poblarlas en servers | AWS EC2, GCP, Azure |
| `/api/cloud/scan` | — | Inserta discovered instances en tabla `servers` con tags `provider,region` | — |
