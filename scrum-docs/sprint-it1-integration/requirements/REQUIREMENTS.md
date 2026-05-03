# 📋 SDLC — Requisitos
## sprint-it1-integration

## Requisitos Funcionales

- - Helper para crear Express app con DB :memory:
- - Seed mínimo (admin user, schema completo)
- - Login + JWT token fixture
- - POST /api/admin/login: credenciales válidas e inválidas
- - Rate limiting (5 intentos)
- - JWT middleware: rutas públicas vs protegidas
- - Token expirado/ inválido
- - GET /api/servers: lista vacía, con datos
- - POST /api/servers/connect: conexión SSH (mock)
- - GET /api/servers/:id: detalle
- - DELETE /api/servers/:id: eliminación
- - POST /api/incidents/create: crea incidente + audit log + notification
- - GET /api/incidents: lista con filtros
- - Incident resolution flow
- - GET /api/thresholds/:id: thresholds de servidor
- - POST /api/thresholds/:serverId: setear thresholds
- - GET /api/compliance/report: reporte real
- - GET /api/notifications: lista configs
- - POST /api/notifications: crear webhook/email/telegram
- - DELETE /api/notifications/:id

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
