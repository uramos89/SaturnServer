# 📊 SDLC — Revisión Sprint 18
## Auditoría: Auth Hardening (bcrypt + Refresh Tokens)

**Fecha:** 2026-05-03
**Estado:** ✅ COMPLETADO

---

## Resultados

| Métrica | Valor |
|---|---|
| US completadas | 4/4 |
| Algoritmo anterior | PBKDF2 |
| Algoritmo nuevo | bcrypt (salt rounds 10) |
| Access token TTL | 15 minutos |
| Refresh token TTL | 7 días |
| GitHub | `a9c088c`, `acf67a5` |

## Hallazgos
- Migración transparente: usuarios PBKDF2 se migran automáticamente al hacer login
- Refresh token rotation previene reuso de tokens robados
- Logout invalida refresh en DB (no solo en cliente)
- Tests bcrypt verifican hash, verify, migration y rotation

## Lo que sigue (Sprint 19)
- DAST + Fuzz testing
- Threat Model STRIDE
- Validación de payloads malformados
