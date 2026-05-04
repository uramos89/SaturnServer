# 📋 SDLC — Requisitos
## sprint-22-remediation

## Requisitos Funcionales

- **Dado** body con `{"username": {"$gt":""}}`, **cuando** se envía, **entonces** HTTP 400, no 500
- **Dado** body con `{"username": {}}`, **cuando** se envía, **entonces** HTTP 400, no 500
- **Dado** Content-Type `utf-16`, **cuando** se recibe, **entonces** HTTP 400
- **Dado** host `169.254.169.254`, **cuando** se conecta SSH, **entonces** HTTP 400 (AWS metadata bloqueado)
- **Dado** host `metadata.google.internal`, **cuando** se conecta SSH, **entonces** HTTP 400
- **Dado** host `0x7f000001` / `2130706433`, **cuando** se conecta SSH, **entonces** HTTP 400
- **Dado** IP privada sin server existente, **cuando** se conecta SSH, **entonces** HTTP 400
- **Dado** CRLF injection en body, **cuando** se envía, **entonces** HTTP 400
- **Dado** Transfer-Encoding malformado, **cuando** se envía, **entonces** HTTP 400
- **Dado** payload >1MB, **cuando** se envía, **entonces** HTTP 413
- **Dado** URL con `%c0%ae%c0%ae`, **cuando** se recibe, **entonces** HTTP 400
- **Dado** cualquier respuesta HTTP, **cuando** se inspecciona, **entonces** incluye HSTS, X-XSS-Protection y Permissions-Policy

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
