# 📋 SDLC — Requisitos
## sprint-27-prometheus

## Requisitos Funcionales

- **Dado** el servidor corriendo, **cuando** se consulta `GET /api/metrics`, **entonces** responde en formato Prometheus exposition
- **Dado** el endpoint, **cuando** se consulta, **entonces** incluye 9 métricas: servers, online, cpu, mem, disk, incidents, skills, users, audit
- **Dado** el endpoint, **cuando** hay servidores registrados, **entonces** cada servidor expone cpu/memory/disk con labels de hostname
- **Dado** Prometheus configurado, **cuando** se apunta a Saturn, **entonces** el target aparece como UP
- **Dado** el scraping activo, **cuando** pasan 15s, **entonces** Prometheus recolecta métricas correctamente
- **Dado** Grafana conectado a Prometheus, **cuando** se carga el dashboard, **entonces** muestra gauges de CPU, RAM y Disk
- **Dado** el roadmap, **cuando** se documenta, **entonces** incluye 6 sprints de evolución de observabilidad

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
