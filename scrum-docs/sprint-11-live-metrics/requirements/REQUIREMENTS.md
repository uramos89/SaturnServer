# 📋 SDLC — Requisitos
## sprint-11-live-metrics

## Requisitos Funcionales

- - **Dado** que hay servidores conectados, **cuando** se carga el dashboard de métricas, **entonces** se muestra un selector con todos los servidores disponibles
- - **Dado** el selector de servidores, **cuando** se selecciona un servidor, **entonces** se muestran las métricas en vivo de ese servidor
- - **Dado** que un servidor está desconectado, **cuando** aparece en el selector, **entonces** se muestra con un indicador de estado (rojo/verde)
- - **Dado** un servidor seleccionado, **cuando** se muestran las métricas, **entonces** hay gauges circulares para CPU%, RAM% y Disk%
- - **Dado** que las métricas cambian, **cuando** se recibe un nuevo valor, **entonces** el gauge se actualiza con animación
- - **Dado** un valor por encima del threshold warning, **cuando** se muestra, **entonces** el gauge cambia a color amarillo
- - **Dado** un valor por encima del threshold critical, **cuando** se muestra, **entonces** el gauge cambia a color rojo
- - **Dado** que hay datos de métricas, **cuando** se muestra el chart, **entonces** se dibujan líneas para CPU, RAM y Disk
- - **Dado** que hay más de 60 puntos de datos, **cuando** se muestra el chart, **entonces** solo se muestran los últimos 60
- - **Dado** el chart, **cuando** el mouse pasa sobre un punto, **entonces** se muestra el tooltip con el valor exacto y timestamp
- - **Dado** que el frontend recibe eventos de métricas, **cuando** llega un nuevo punto, **entonces** se acumula en un buffer local
- - **Dado** el buffer de métricas, **cuando** alcanza 120 puntos por servidor, **entonces** los más antiguos se descartan (FIFO)
- - **Dado** el buffer, **cuando** el usuario cierra y vuelve a abrir la página, **entonces** los datos se restauran desde localStorage
- - **Dado** un servidor seleccionado, **cuando** se cambia la selección, **entonces** el frontend envía `subscribe:server` con el ID del servidor
- - **Dado** un servidor previamente seleccionado, **cuando** se cambia a otro, **entonces** envía `unsubscribe:server` del anterior
- - **Dado** que no hay servidor seleccionado, **cuando** se carga la página, **entonces** no hay suscripción activa

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
