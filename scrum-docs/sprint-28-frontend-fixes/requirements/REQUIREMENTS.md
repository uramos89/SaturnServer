# 📋 SDLC — Requisitos
## sprint-28-frontend-fixes

## Requisitos Funcionales

- **Dado** la vista de detalle de servidor, **cuando** se hace clic en la pestaña Config, **entonces** muestra campos editables para username, password y puerto SSH
- **Dado** la pestaña Config, **cuando** se abre, **entonces** muestra sliders para thresholds CPU/RAM/Disk
- **Dado** cambios en configuración, **cuando** se guarda, **entonces** se llama a `PUT /api/servers/:id/config`
- **Dado** una tarjeta de servidor, **cuando** se hace hover, **entonces** muestra un botón de eliminar (icono Trash2)
- **Dado** el botón de eliminar, **cuando** se hace clic, **entonces** pide confirmación antes de eliminar
- **Dado** la confirmación, **cuando** se acepta, **entonces** llama a `DELETE /api/servers/:id` con try/catch
- **Dado** un error de API, **cuando** ocurre, **entonces** el servidor se elimina del frontend igualmente
- **Dado** el campo Port en la interfaz, **cuando** se renderiza, **entonces** aparece en color naranja
- **Dado** `src/routes/servers.ts`, **cuando** se carga, **entonces** no lanza `require is not defined`
- **Dado** el modal AddNode, **cuando** se abre, **entonces** incluye un campo Port (default 22) y toggle visibilidad de contraseña
- **Dado** el endpoint `PUT /api/servers/:id/config`, **cuando** se envía configuración, **entonces** actualiza SSH y thresholds

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
