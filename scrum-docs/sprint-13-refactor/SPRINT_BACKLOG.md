# 🏃 Sprint 13: Refactor server.ts — De 2,335 líneas a routers modulares

> **Feature Reference:** TD-002 (Refactor: unificar nomenclatura)
> **Estado:** ✅ COMPLETADO (verificado)

## Objetivo
Partir `server.ts` en módulos por dominio. server.ts solo bootstrap.

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Extraer encrypt/decrypt a utils
**Como** desarrollador,
**Quiero** mover `encrypt()` y `decrypt()` de server.ts a `src/lib/crypto-utils.ts`,
**Para** que server.ts no tenga lógica de encriptación duplicada.

**Criterios de Aceptación:**
- **Dado** el archivo `server.ts`, **cuando** se busca la función `encrypt()`, **entonces** no debe estar definida en server.ts (debe importarse)
- **Dado** el archivo `src/lib/crypto-utils.ts`, **cuando** existe, **entonces** exporta `encrypt()` y `decrypt()` usando AES-256-CBC con ENCRYPTION_KEY derivado del pepper
- **Dado** un texto encriptado con `encrypt()`, **cuando** se desencripta con `decrypt()`, **entonces** se obtiene el texto original

### US-002: Extraer DB schema a src/db/schema.ts
**Como** desarrollador,
**Quiero** mover los CREATE TABLE statements a un archivo separado,
**Para** mantener server.ts limpio de definiciones de esquema.

**Criterios de Aceptación:**
- **Dado** el archivo `src/db/schema.ts`, **cuando** existe, **entonces** contiene todos los CREATE TABLE statements
- **Dado** `server.ts`, **cuando** inicia, **entonces** importa y ejecuta el schema desde `src/db/schema.ts`

### US-003: Extraer seed de admin user a src/db/seed.ts
**Como** desarrollador,
**Quiero** mover la lógica de creación del admin por defecto a un seed module,
**Para** separar la inicialización de datos del bootstrap del servidor.

**Criterios de Aceptación:**
- **Dado** `src/db/seed.ts`, **cuando** existe, **entonces** contiene la lógica de creación del admin por defecto
- **Dado** que no hay usuarios en DB, **cuando** se ejecuta el seed, **entonces** crea el admin con username `admin` y password configurable

### US-004: Extraer rutas a src/routes/*.ts
**Como** desarrollador,
**Quiero** que cada dominio tenga su propio archivo de rutas,
**Para** mantener el código organizado y testeable.

**Criterios de Aceptación:**
- **Dado** el directorio `src/routes/`, **cuando** se listan los archivos, **entonces** existen routers para: auth, servers, incidents, notifications, skills, ai, thresholds, proactive, cloud, neural, contextp, compliance, admin, setup
- **Dado** `server.ts`, **cuando** inicia, **entonces** importa y monta cada router bajo `/api`
- **Dado** un router individual, **cuando** se monta en server.ts, **entonces** las rutas funcionan exactamente como antes del refactor

### US-005: server.ts como bootstrap
**Como** desarrollador,
**Quiero** que server.ts solo haga bootstrap del servidor,
**Para** que sea fácil de entender y mantener.

**Criterios de Aceptación:**
- **Dado** `server.ts`, **cuando** se revisa, **entonces** solo contiene: imports, inicialización de DB, configuración de middleware, montaje de routers, e inicio del servidor HTTP
- **Dado** `server.ts`, **cuando** se revisa, **entonces** no contiene definiciones de rutas inline, lógica de seed, ni funciones de ayuda duplicadas

---

## 📦 Archivos creados/modificados

```
src/routes/auth.ts
src/routes/servers.ts
src/routes/incidents.ts
src/routes/notifications.ts
src/routes/skills.ts
src/routes/ai.ts
src/routes/thresholds.ts
src/routes/proactive.ts
src/routes/cloud.ts
src/routes/neural.ts
src/routes/contextp.ts
src/routes/compliance.ts
src/routes/admin.ts
src/routes/setup.ts
src/lib/crypto-utils.ts
src/db/schema.ts
src/db/seed.ts
```
