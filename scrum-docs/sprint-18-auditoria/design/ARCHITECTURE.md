# 🏗️ SDLC — Diseño
## sprint-18-auditoria

## Contexto
Migrar de PBKDF2 a bcrypt para hashing de contraseñas. Implementar refresh tokens JWT con rotación automática.

## Flujo de autenticación
```
POST /api/auth/login
  ├─ Buscar usuario por username
  ├─ Verificar hash (bcrypt.verify, o bcrypt.compare para migrados)
  │   └─ Si era PBKDF2 → actualizar hash a bcrypt
  ├─ Generar access token (15 min) + refresh token (7d)
  ├─ Guardar refresh token en tabla refresh_tokens
  └─ Devolver { accessToken, refreshToken, user }

POST /api/auth/refresh
  ├─ Validar refresh token (JWT + DB)
  ├─ Rotar: eliminar viejo, crear nuevo
  └─ Devolver { accessToken, refreshToken }

POST /api/auth/logout
  ├─ Invalidar refresh token en DB
  └─ HTTP 200 OK
```

## Archivos involucrados
- `src/server.ts` — Endpoints de autenticación
- `src/lib/auth.ts` — Migración PBKDF2→bcrypt
- `src/lib/db.ts` — Schema refresh_tokens
- `tests/auth.test.ts` — Tests bcrypt

## Decisiones técnicas
- bcrypt con 10 salt rounds (balance seguridad/rendimiento)
- Refresh token rotation: cada uso invalida el anterior (detecta robo)
- Auto-migración en login: detecta hash PBKDF2 por ausencia de prefijo `$2b$`
