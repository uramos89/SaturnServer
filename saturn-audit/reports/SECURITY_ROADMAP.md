# 🛡️ Saturn Server — Security Roadmap (SSDLC)

> Basado en el framework: OWASP + NIST + Secure SDLC + DevSecOps

---

## 📊 Estado Actual vs Objetivo

| Capa | Lo que tenemos | Lo que falta | Prioridad |
|---|---|---|---|
| **SAST** | ESLint estándar | `eslint-plugin-security`, `sonarjs` | 🔴 Alta |
| **SCA** | `package-lock.json` | `npm audit` automático en pipeline, `snyk`/`dependabot` | 🔴 Alta |
| **DAST** | — | Escaneo de endpoints en staging | 🟡 Media |
| **Auth** | JWT + PBKDF2 | MFA/TOTP, refresh tokens, rate-limit por usuario | 🟡 Media |
| **Secrets** | `.env` + vault directorios | HashiCorp Vault / SOPS para secrets en reposo | 🟡 Media |
| **Input val.** | Zod schemas | Fuzz testing, sanitización HTML | 🟡 Media |
| **Encryption** | AES-256-CBC (credenciales) | Migrar a AES-256-GCM (ya existe en Identity Vault) | 🔵 Baja |
| **Password hash** | PBKDF2-SHA512 | Migrar a bcrypt/argon2id | 🟡 Media |
| **TLS** | No implementado | Forzar HTTPS con certificado auto-firmado o Let's Encrypt | 🔴 Alta |
| **Logging** | Audit logs + compliance | Detección de anomalías, SIEM integration | 🔵 Baja |
| **Threat model** | — | Documentar STRIDE por módulo | 🟡 Media |
| **CI/CD gates** | — | Security gate: si falla SAST/SCA → no deploy | 🔴 Alta |

---

## 🎯 Plan de Implementación (Sprints 17+)

### Sprint 17 — SAST + SCA + TLS
1. Agregar `eslint-plugin-security` y `eslint-plugin-sonarjs`
2. Agregar `npm audit` como paso pre-deploy en `install.sh`
3. Generar certificado TLS auto-firmado en `install.sh`
4. Forzar HTTPS en producción

### Sprint 18 — Auth hardening + Secrets
1. Agregar refresh tokens JWT
2. Migrar PBKDF2 → bcrypt
3. Rotación de secrets en vault

### Sprint 19 — DAST + Fuzz + Threat model
1. Escaneo OWASP ZAP en staging
2. Documentar STRIDE por módulo
3. Fuzz testing endpoints

---

## ✅ Security Checklist (pre-producción)

- [ ] 0 vulnerabilidades críticas (CVSS ≥ 7.0)
- [ ] SAST sin errores de seguridad
- [ ] SCA sin CVEs críticos en dependencias
- [ ] TLS 1.2+ habilitado
- [ ] Secrets protegidos (no hardcodeados)
- [ ] Rate limiting por endpoint
- [ ] CORS configurado estrictamente
- [ ] Validación de inputs en todos los endpoints
- [ ] Auditoría de compliance habilitada
- [ ] Password hashing con algoritmo seguro

---

## Integración en el flujo de trabajo

El SDLC existente se extiende:

```
Requirements → Design → [Threat Modeling] → Implement → [SAST + SCA] → Tests → [DAST] → Review → Push → [Security Gate] → Deploy
```

Donde [Security Gate] bloquea el deploy si:
- Hay vulnerabilidades críticas sin parche
- SAST detecta errores de seguridad
- SCA encuentra CVEs críticos
- Secrets expuestos en el código
