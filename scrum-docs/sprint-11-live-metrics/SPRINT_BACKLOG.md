# 🏃 Sprint 11: Live Metrics Dashboard

> **Feature Reference:** EP-13 (Live Stream)
> **Estado:** ❌ No iniciado (pendiente de implementación)

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Server Selector en Dashboard
**Como** operador,
**Quiero** un selector de servidor en el dashboard de métricas,
**Para** elegir qué servidor monitorear.

**Criterios de Aceptación:**
- **Dado** que hay servidores conectados, **cuando** se carga el dashboard de métricas, **entonces** se muestra un selector con todos los servidores disponibles
- **Dado** el selector de servidores, **cuando** se selecciona un servidor, **entonces** se muestran las métricas en vivo de ese servidor
- **Dado** que un servidor está desconectado, **cuando** aparece en el selector, **entonces** se muestra con un indicador de estado (rojo/verde)

### US-002: Gauges en tiempo real
**Como** operador,
**Quiero** ver gauges animados de CPU, RAM y Disk,
**Para** visualizar el estado del servidor de un vistazo.

**Criterios de Aceptación:**
- **Dado** un servidor seleccionado, **cuando** se muestran las métricas, **entonces** hay gauges circulares para CPU%, RAM% y Disk%
- **Dado** que las métricas cambian, **cuando** se recibe un nuevo valor, **entonces** el gauge se actualiza con animación
- **Dado** un valor por encima del threshold warning, **cuando** se muestra, **entonces** el gauge cambia a color amarillo
- **Dado** un valor por encima del threshold critical, **cuando** se muestra, **entonces** el gauge cambia a color rojo

### US-003: Charts históricos (últimos 60 puntos)
**Como** operador,
**Quiero** ver gráficos de línea con el historial de métricas,
**Para** identificar tendencias y patrones.

**Criterios de Aceptación:**
- **Dado** que hay datos de métricas, **cuando** se muestra el chart, **entonces** se dibujan líneas para CPU, RAM y Disk
- **Dado** que hay más de 60 puntos de datos, **cuando** se muestra el chart, **entonces** solo se muestran los últimos 60
- **Dado** el chart, **cuando** el mouse pasa sobre un punto, **entonces** se muestra el tooltip con el valor exacto y timestamp

### US-004: Buffer de métricas en frontend
**Como** sistema,
**Quiero** acumular métricas del stream Socket.io en un buffer,
**Para** mantener históricos sin sobrecargar el servidor.

**Criterios de Aceptación:**
- **Dado** que el frontend recibe eventos de métricas, **cuando** llega un nuevo punto, **entonces** se acumula en un buffer local
- **Dado** el buffer de métricas, **cuando** alcanza 120 puntos por servidor, **entonces** los más antiguos se descartan (FIFO)
- **Dado** el buffer, **cuando** el usuario cierra y vuelve a abrir la página, **entonces** los datos se restauran desde localStorage

### US-005: Auto-suscripción Socket.io
**Como** sistema,
**Quiero** suscribirme automáticamente a las métricas del servidor seleccionado,
**Para** recibir datos en tiempo real sin intervención manual.

**Criterios de Aceptación:**
- **Dado** un servidor seleccionado, **cuando** se cambia la selección, **entonces** el frontend envía `subscribe:server` con el ID del servidor
- **Dado** un servidor previamente seleccionado, **cuando** se cambia a otro, **entonces** envía `unsubscribe:server` del anterior
- **Dado** que no hay servidor seleccionado, **cuando** se carga la página, **entonces** no hay suscripción activa
