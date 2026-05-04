# 🏗️ SDLC — Diseño
## sprint-28-frontend-fixes

## Contexto
Mejorar la UI/UX del frontend de Saturn con nuevas funcionalidades y corrección de bugs en el panel de servidores.

## Componentes afectados
```
ServerCard.tsx
  ├─ Botón Trash2 en hover (DELETE /api/servers/:id)
  └─ Confirmación antes de eliminar

ServerDetailView.tsx
  └─ Pestaña Config (nueva)
       ├─ SSH: username, password, port
       └─ Thresholds: CPU/RAM/Disk warning + critical (sliders)
            └─ PUT /api/servers/:id/config

AddNodeModal.tsx
  ├─ Campo Port (default 22)
  ├─ Password eye toggle (Eye/EyeOff)
  └─ Puerto incluido en payload SSH

Routes:
  PUT /api/servers/:id/config
    ├─ Valida body (username, password, port, thresholds)
    ├─ Desconecta SSH si credenciales cambiaron
    └─ Actualiza en DB

Fixes:
  servers.ts: require() → ESM import
  Port field: color naranja (CSS class)
```

## Archivos involucrados
- `src/routes/servers.ts` — Config endpoint + ESM fix
- `src/components/ServerCard.tsx` — Delete button
- `src/components/AddNodeModal.tsx` — Port field + password toggle
- `src/components/ServerDetailView.tsx` — Config tab
