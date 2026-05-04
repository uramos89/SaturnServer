# 🧪 SDLC — Pruebas
## sprint-28-frontend-fixes

## Pruebas

| Test | Descripción | Resultado |
|---|---|---|
| Config tab | Pestaña Config muestra SSH + thresholds editables | ✅ |
| Config save | PUT /api/servers/:id/config actualiza configuración | ✅ |
| Delete server | Botón Trash2 en hover + confirmación + DELETE API | ✅ |
| Delete fallback | Si API falla, servidor se elimina del frontend igual | ✅ |
| Port naranja | Campo Port con clase CSS naranja | ✅ |
| ESM import | servers.ts sin `require()` | ✅ |
| AddNode port | Modal incluye campo Port (default 22) | ✅ |
| Password toggle | Eye/EyeOff toggle funciona | ✅ |
| SSH disconnect | Cambiar credenciales desconecta SSH | ✅ |

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
