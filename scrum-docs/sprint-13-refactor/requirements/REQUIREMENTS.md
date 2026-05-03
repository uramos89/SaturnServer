# 📋 SDLC — Requisitos
## sprint-13-refactor

## Requisitos Funcionales

- - **Dado** el archivo `server.ts`, **cuando** se busca la función `encrypt()`, **entonces** no debe estar definida en server.ts (debe importarse)
- - **Dado** el archivo `src/lib/crypto-utils.ts`, **cuando** existe, **entonces** exporta `encrypt()` y `decrypt()` usando AES-256-CBC con ENCRYPTION_KEY derivado del pepper
- - **Dado** un texto encriptado con `encrypt()`, **cuando** se desencripta con `decrypt()`, **entonces** se obtiene el texto original
- - **Dado** el archivo `src/db/schema.ts`, **cuando** existe, **entonces** contiene todos los CREATE TABLE statements
- - **Dado** `server.ts`, **cuando** inicia, **entonces** importa y ejecuta el schema desde `src/db/schema.ts`
- - **Dado** `src/db/seed.ts`, **cuando** existe, **entonces** contiene la lógica de creación del admin por defecto
- - **Dado** que no hay usuarios en DB, **cuando** se ejecuta el seed, **entonces** crea el admin con username `admin` y password configurable
- - **Dado** el directorio `src/routes/`, **cuando** se listan los archivos, **entonces** existen routers para: auth, servers, incidents, notifications, skills, ai, thresholds, proactive, cloud, neural, contextp, compliance, admin, setup
- - **Dado** `server.ts`, **cuando** inicia, **entonces** importa y monta cada router bajo `/api`
- - **Dado** un router individual, **cuando** se monta en server.ts, **entonces** las rutas funcionan exactamente como antes del refactor
- - **Dado** `server.ts`, **cuando** se revisa, **entonces** solo contiene: imports, inicialización de DB, configuración de middleware, montaje de routers, e inicio del servidor HTTP
- - **Dado** `server.ts`, **cuando** se revisa, **entonces** no contiene definiciones de rutas inline, lógica de seed, ni funciones de ayuda duplicadas

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
