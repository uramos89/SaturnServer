# Sprint IT-1: Integration Tests (API + DB)

Usar supertest + DB en memoria para testear endpoints reales.

## US-001: Test infrastructure
- Helper para crear Express app con DB :memory:
- Seed mínimo (admin user, schema completo)
- Login + JWT token fixture

## US-002: Auth & Security
- POST /api/admin/login: credenciales válidas e inválidas
- Rate limiting (5 intentos)
- JWT middleware: rutas públicas vs protegidas
- Token expirado/ inválido

## US-003: Server endpoints
- GET /api/servers: lista vacía, con datos
- POST /api/servers/connect: conexión SSH (mock)
- GET /api/servers/:id: detalle
- DELETE /api/servers/:id: eliminación

## US-004: Incident lifecycle
- POST /api/incidents/create: crea incidente + audit log + notification
- GET /api/incidents: lista con filtros
- Incident resolution flow

## US-005: Threshold endpoints
- GET /api/thresholds/:id: thresholds de servidor
- POST /api/thresholds/:serverId: setear thresholds
- GET /api/compliance/report: reporte real

## US-006: Notification endpoints
- GET /api/notifications: lista configs
- POST /api/notifications: crear webhook/email/telegram
- DELETE /api/notifications/:id

## US-007: Proactive activities
- GET /api/proactive: lista
- POST /api/proactive: crear actividad
- DELETE /api/proactive/:id
