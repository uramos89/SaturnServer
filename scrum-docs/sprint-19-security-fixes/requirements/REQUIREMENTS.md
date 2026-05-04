# 📋 SDLC — Requisitos
## sprint-19-security-fixes

## Requisitos Funcionales

- **Dado** el modelo STRIDE, **cuando** se documenta, **entonces** cubre 6 módulos: Auth, SSH, AI, Skills, Notifications, Frontend
- **Dado** el threat model, **cuando** se completa, **entonces** incluye 17 amenazas documentadas con mitigaciones
- **Dado** cada amenaza, **cuando** se registra, **entonces** incluye categoría STRIDE, descripción, impacto y mitigación propuesta
- **Dado** el fuzzer, **cuando** se ejecuta, **entonces** prueba 45+ casos con payloads malformados
- **Dado** un payload SQLi, **cuando** se envía, **entonces** la API no devuelve error 500
- **Dado** un payload XSS, **cuando** se envía, **entonces** la API no refleja el script sin sanitizar
- **Dado** path traversal, **cuando** se envía, **entonces** la API lo rechaza
- **Dado** null bytes, arrays, large bodies, **cuando** se envían, **entonces** la API maneja el error gracefulmente
- **Dado** la suite de fuzz, **cuando** se ejecuta, **entonces** incluye tests para SQLi, XSS, path traversal, null, arrays, large bodies
- **Dado** cualquier test que produce error 500, **cuando** se revisa, **entonces** se documenta como finding

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
