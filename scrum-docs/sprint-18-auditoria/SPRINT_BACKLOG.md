# 🏃 Sprint 18 — Auth Hardening (bcrypt + Refresh Tokens JWT)

**Periodo:** 2026-05-03
**Objetivo:** Migrar el hashing de contraseñas de PBKDF2 a bcrypt, implementar refresh tokens JWT con rotación, y añadir logout que invalida tokens.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Migrar PBKDF2 → bcrypt
**Como** desarrollador,
**Quiero** migrar el hash de contraseñas de PBKDF2 a bcrypt,
**Para** mejorar la seguridad del almacenamiento de credenciales.

**Criterios de Aceptación:**
- **Dado** un usuario registrado con PBKDF2, **cuando** inicia sesión, **entonces** la contraseña se verifica con bcrypt y se actualiza automáticamente
- **Dado** un nuevo registro, **cuando** se guarda la contraseña, **entonces** usa bcrypt con salt rounds ≥ 10
- **Dado** el schema de base de datos, **cuando** se consulta un usuario, **entonces** el campo hash incluye prefijo `$2b$` indicando bcrypt

### US-002: Refresh tokens JWT con rotación
**Como** sistema de autenticación,
**Quiero** implementar refresh tokens JWT que se roten al usarlos,
**Para** minimizar el riesgo si un token es comprometido.

**Criterios de Aceptación:**
- **Dado** un login exitoso, **cuando** se genera el token, **entonces** se devuelve access token (15 min) + refresh token (7 días)
- **Dado** un refresh token válido, **cuando** se usa para renovar, **entonces** se invalida el anterior y se emite uno nuevo
- **Dado** un refresh token usado dos veces, **cuando** se detecta reuso, **entonces** se invalidan todos los tokens del usuario

### US-003: Logout endpoint
**Como** usuario,
**Quiero** cerrar sesión y que el refresh token quede invalidado,
**Para** que nadie más pueda usar mi sesión.

**Criterios de Aceptación:**
- **Dado** un usuario autenticado, **cuando** llama a `POST /api/auth/logout`, **entonces** el refresh token se invalida en la base de datos
- **Dado** un token invalidado, **cuando** se intenta usar para renovar, **entonces** devuelve HTTP 401

### US-004: Tests de bcrypt
**Como** desarrollador,
**Quiero** tests que verifiquen el funcionamiento de bcrypt,
**Para** asegurar que la migración no rompe la autenticación.

**Criterios de Aceptación:**
- **Dado** el test suite de auth, **cuando** se ejecuta, **entonces** verifica que bcrypt hash/verify funciona
- **Dado** el test de migración, **cuando** se simula un login con hash PBKDF2, **entonces** verifica que se migra correctamente a bcrypt

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| US planificadas | 4 |
| US completadas | 4 ✅ |
| Algoritmo anterior | PBKDF2 |
| Algoritmo nuevo | bcrypt (salt rounds 10) |
| Access token TTL | 15 minutos |
| Refresh token TTL | 7 días |
| GitHub | `a9c088c`, `acf67a5` |
| Producción | Health 200 ✅ |
