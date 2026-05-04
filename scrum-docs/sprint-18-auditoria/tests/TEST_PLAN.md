# 🧪 SDLC — Pruebas
## sprint-18-auditoria

## Pruebas Unitarias

| Test | Descripción | Resultado |
|---|---|---|
| bcrypt hash | Verificar que bcrypt genera hash con prefijo `$2b$` | ✅ |
| bcrypt verify | Verificar que bcrypt.compare funciona con hash válido | ✅ |
| Migración PBKDF2→bcrypt | Login con hash PBKDF2 migra y verifica | ✅ |
| Refresh token rotation | Usar refresh → invalida anterior, emite nuevo | ✅ |
| Reuse detection | Refresh usado dos veces invalida todos los tokens | ✅ |
| Logout invalidation | Logout invalida refresh token | ✅ |

## Criterios de Aceptación
Ver SPRINT_BACKLOG.md para los Given/When/Then de cada US.
