# 🧪 SDLC — Pruebas
## sprint-17-security

## Pruebas

| Test | Descripción | Resultado |
|---|---|---|
| eslint-security | `npm run lint:security` detecta reglas de seguridad | ✅ |
| eslint-sonarjs | Linter detecta code smells | ✅ |
| npm audit | `npm run audit` ejecuta y reporta vulnerabilidades | ✅ |
| TLS generation | install.sh genera cert + key en ssl/ | ✅ |
| TLS env vars | .env contiene TLS_CERT y TLS_KEY | ✅ |
| Idempotent TLS | Ejecutar install.sh de nuevo no sobrescribe cert | ✅ |

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
