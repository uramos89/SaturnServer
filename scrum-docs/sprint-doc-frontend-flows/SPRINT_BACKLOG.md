# Sprint Documentación: Frontend End-to-End Flows

Documentar todos los flujos de interacción del frontend de Saturn Server.

## US-001: Arquitectura general
- Componentes, vistas, modales, estado global
- Árbol de renderizado de App.tsx

## US-002: Login + Setup
- Login flow con JWT
- Onboarding Wizard de 3 pasos (AI, Notificaciones, SSH)

## US-003: Dashboard
- Live Metrics con Socket.io
- Server selector, gauges, charts, subscripciones

## US-004: Servers
- List view con filtro y AddNodeModal
- ServerDetailView con 13 sub-tabs
- Terminal interactivo

## US-005: Skills, Proactive, Credentials, ContextP
- Skills View + Import + Source modals
- Proactive Activities CRUD
- Cloud Credentials + Scan
- ContextP TreeView + Sync

## US-006: Notificaciones, Audit, Settings, Admin
- Notifications CRUD
- Audit logs read-only
- Settings: AI, Remediation, SMTP, Telegram, Skills
- Admin: User management

## US-007: Socket.io + Estado Global
- useSocket hook completo
- Matriz de estados con orígenes
