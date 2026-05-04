# 📋 SDLC — Requisitos
## sprint-18-auditoria

## Requisitos Funcionales

- **Dado** un usuario registrado con PBKDF2, **cuando** inicia sesión, **entonces** la contraseña se verifica con bcrypt y se actualiza automáticamente
- **Dado** un nuevo registro, **cuando** se guarda la contraseña, **entonces** usa bcrypt con salt rounds ≥ 10
- **Dado** el schema de base de datos, **cuando** se consulta un usuario, **entonces** el campo hash incluye prefijo `$2b$` indicando bcrypt
- **Dado** un login exitoso, **cuando** se genera el token, **entonces** se devuelve access token (15 min) + refresh token (7 días)
- **Dado** un refresh token válido, **cuando** se usa para renovar, **entonces** se invalida el anterior y se emite uno nuevo
- **Dado** un refresh token usado dos veces, **cuando** se detecta reuso, **entonces** se invalidan todos los tokens del usuario
- **Dado** un usuario autenticado, **cuando** llama a `POST /api/auth/logout`, **entonces** el refresh token se invalida en la base de datos
- **Dado** un token invalidado, **cuando** se intenta usar para renovar, **entonces** devuelve HTTP 401

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
