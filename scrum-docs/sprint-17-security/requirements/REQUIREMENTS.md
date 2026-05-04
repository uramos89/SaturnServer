# 📋 SDLC — Requisitos
## sprint-17-security

## Requisitos Funcionales

- **Dado** `eslint-plugin-security` instalado, **cuando** se ejecuta `npm run lint:security`, **entonces** analiza el código con reglas como `security/detect-object-injection`
- **Dado** `eslint-plugin-sonarjs` instalado, **cuando** se ejecuta el linter, **entonces** detecta code smells y bugs
- **Dado** código con `eval()`, **cuando** pasa por el linter, **entonces** lo marca como error de seguridad
- **Dado** `install.sh`, **cuando** se ejecuta, **entonces** corre `npm audit` después de `npm install`
- **Dado** vulnerabilidades críticas, **cuando** se detectan, **entonces** muestra advertencia en la salida
- **Dado** sin vulnerabilidades críticas, **cuando** se completa, **entonces** muestra "No critical vulnerabilities"
- **Dado** `install.sh`, **cuando** se ejecuta, **entonces** genera un certificado TLS auto-firmado en `ssl/server.crt`
- **Dado** el certificado generado, **cuando** se completa, **entonces** escribe `TLS_CERT` y `TLS_KEY` en `.env`
- **Dado** un certificado existente, **cuando** se ejecuta de nuevo, **entonces** no lo sobrescribe
- **Dado** `package.json`, **cuando** se ejecuta `npm run lint:security`, **entonces** corre eslint con reglas de seguridad
- **Dado** `package.json`, **cuando** se ejecuta `npm run audit`, **entonces** corre `npm audit`

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
