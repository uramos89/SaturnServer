# 📋 SDLC — Requisitos
## sprint-21-security-audit

## Requisitos Funcionales

- **Dado** el script `create-lab.sh`, **cuando** se ejecuta, **entonces** crea 4 contenedores Docker SSH web01, db01, load01, monitor01
- **Dado** los contenedores, **cuando** están activos, **entonces** cada uno expone SSH en puertos 2222-2225
- **Dado** los contenedores, **cuando** se conecta vía SSH, **entonces** cada uno tiene servicios falsos
- **Dado** el pentest runner, **cuando** se ejecuta, **entonces** realiza 150+ ataques documentados
- **Dado** el pentest, **cuando** se completa, **entonces** genera reporte HTML con resultados
- **Dado** el reporte, **cuando** se genera, **entonces** incluye hallazgos y puntuación de seguridad
- **Dado** `audit-runner.js`, **cuando** se ejecuta, **entonces** valida login, servidores, skills, notificaciones
- **Dado** el threat model, **cuando** se documenta, **entonces** cubre 6 módulos con 17 amenazas
- **Dado** las amenazas, **cuando** se documentan, **entonces** incluyen FINDING-001 a FINDING-004

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
