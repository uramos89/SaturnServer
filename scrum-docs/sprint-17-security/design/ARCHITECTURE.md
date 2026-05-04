# 🏗️ SDLC — Diseño
## sprint-17-security

## Contexto
Integrar herramientas de seguridad en el SDLC: SAST (Static Application Security Testing), SCA (Software Composition Analysis), y TLS.

## Flujo DevSecOps
```
Código → SAST (eslint-security + sonarjs) → Build → SCA (npm audit) → Deploy → TLS
```

## Archivos involucrados
- `.eslintrc.json` — Reglas de seguridad añadidas
- `package.json` — Scripts `lint:security` y `audit`
- `install.sh` — npm audit automático + generación TLS
- `ssl/server.crt` + `ssl/server.key` — Certificado auto-firmado

## Decisiones técnicas
- eslint-plugin-security: detecta `eval()`, `child_process`, `RegExp` DoS, object injection
- eslint-plugin-sonarjs: detecta code smells, complejidad, bugs
- npm audit: se ejecuta post-install en install.sh
- TLS: auto-firmado con openssl, duración 365 días
- .env protegido con TLS_CERT y TLS_KEY
