# 📋 SDLC — Requisitos
## sprint-10

## Requisitos Funcionales

- - **Dado** el ContextP Explorer en el frontend, **cuando** se expande el árbol, **entonces** se muestran los 5 contratos (ROOT, TECH, FUNC, STRUCT, AUDIT)
- - **Dado** un contrato en el árbol, **cuando** se hace clic, **entonces** se muestra su contenido completo
- - **Dado** que los contratos están en el filesystem, **cuando** se carga el explorador, **entonces** los contratos se sincronizan desde ContextP/CONTRACTS/
- - **Dado** archivos en el directorio ContextP/, **cuando** se invoca `POST /api/contextp/sync`, **entonces** se leen todos los archivos y se insertan/actualizan en `contextp_entries`
- - **Dado** archivos modificados en disco, **cuando** se invoca sync, **entonces** las entries en DB se actualizan con el nuevo contenido
- - **Dado** el sync completado, **cuando** se consulta `GET /api/contextp/*`, **entonces** devuelve datos desde la DB
- - **Dado** un servidor recién iniciado, **cuando** se ejecuta el seed inicial, **entonces** contextp_entries tiene al menos 6 filas
- - **Dado** entries en la tabla, **cuando** se consultan, **entonces** cada entry tiene `path`, `content`, `type` y `lastUpdated`
- - **Dado** el dashboard, **cuando** se carga, **entonces** hay un enlace "Notifications" en la sidebar
- - **Dado** el tab de Notificaciones, **cuando** se selecciona, **entonces** muestra las configuraciones actuales (webhook, email, telegram)
- - **Dado** el tab de Notificaciones, **cuando** se añade o elimina una configuración, **entonces** la lista se actualiza sin recargar la página
- - **Dado** el dashboard, **cuando** se accede a la sección de Compliance, **entonces** se muestra el reporte con métricas de cobertura
- - **Dado** el reporte de compliance, **cuando** hay eventos registrados, **entonces** se muestra el conteo por tipo y cobertura regulatoria
- - **⚠️ Pendiente:** Esta US queda para backlog futuro. Backend de Socket.io implementado y funcional. Falta frontend dedicado.
- - **Dado** un servidor conectado, **cuando** Socket.io está activo, **entonces** emite eventos de métricas periódicos
- - **Dado** el frontend recibe eventos de métricas, **cuando** se implemente el dashboard, **entonces** mostrará CPU/RAM/Disk en vivo
- | Feature | Antes | Después |
- |---|---|---|
- | ContextP tree | SKILLS, PARAMS, IDENTITY, AUDIT | + CONTRACTS |
- | contextp_entries | 0 filas | 6 filas sincronizadas |

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
