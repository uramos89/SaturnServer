# 🏃 Sprint 5 — Seguridad + Comunicación Reactiva

> **Feature Reference:** EP-14 (Comunicación Reactiva), TD-001 (JWT Middleware)
> **Sprint Goal:** Endpoints asegurados con JWT + Bot de Telegram con flujo conversacional completo

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Total US planificadas | 8 |
| Completadas | 8 |

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: JWT Middleware global
**Como** administrador del sistema,
**Quiero** que todos los endpoints API estén protegidos con JWT,
**Para** que solo usuarios autenticados puedan acceder a la plataforma.

**Criterios de Aceptación:**
- **Dado** un endpoint protegido (ej. `/api/servers`), **cuando** se invoca sin token JWT, **entonces** responde HTTP 401 con `{ error: "Authentication required" }`
- **Dado** un endpoint protegido, **cuando** se invoca con token JWT expirado o inválido, **entonces** responde HTTP 403 con `{ error: "Invalid or expired token" }`
- **Dado** un endpoint público (`/api/health`, `/api/setup/status`, `/api/admin/login`), **cuando** se invoca sin token, **entonces** responde correctamente sin requerir autenticación
- **Dado** un token JWT válido, **cuando** se invoca cualquier endpoint protegido, **entonces** el middleware valida el token y permite el acceso

### US-002: PUBLIC_PATHS correctos
**Como** desarrollador,
**Quiero** que los paths públicos estén correctamente definidos relativos a `/api`,
**Para** que los endpoints de health, setup y login sean accesibles sin autenticación.

**Criterios de Aceptación:**
- **Dado** que un path está definido como público, **cuando** se accede a `GET /api/health`, **entonces** no se requiere token JWT
- **Dado** que un path está definido como público, **cuando** se accede a `POST /api/admin/login`, **entonces** no se requiere token JWT
- **Dado** cualquier otro path bajo `/api/`, **cuando** se accede sin autenticación, **entonces** se rechaza con 401

### US-003: authenticateJWT con JSON errors
**Como** cliente API,
**Quiero** que los errores de autenticación sean en formato JSON,
**Para** poder manejarlos consistentemente en el frontend.

**Criterios de Aceptación:**
- **Dado** una solicitud sin token, **cuando** el middleware rechaza, **entonces** la respuesta es JSON con `{ error: "Authentication required" }`
- **Dado** una solicitud con token inválido, **cuando** el middleware rechaza, **entonces** la respuesta es JSON con `{ error: "Invalid or expired token" }`
- **Dado** cualquier error de autenticación, **cuando** se envía la respuesta, **entonces** el Content-Type es `application/json`

### US-004: Telegram Bot Service
**Como** administrador,
**Quiero** un bot de Telegram que reciba y responda mensajes,
**Para** gestionar servidores desde Telegram.

**Criterios de Aceptación:**
- **Dado** que el bot está configurado con un token válido, **cuando** se envía un mensaje a `POST /api/telegram/webhook`, **entonces** el bot procesa el mensaje y responde
- **Dado** que el bot está configurado, **cuando** se invoca `POST /api/telegram/set-webhook`, **entonces** registra el webhook en la API de Telegram y devuelve éxito
- **Dado** que el bot está configurado, **cuando** se invoca `POST /api/telegram/test`, **entonces** envía un mensaje de prueba y devuelve el resultado
- **Dado** cualquier error de conexión con Telegram, **cuando** se intenta enviar un mensaje, **entonces** el error se captura y registra sin colapsar el servicio

### US-005: Flujo conversacional completo
**Como** administrador,
**Quiero** tener una conversación multi-turno con el bot,
**Para** ejecutar acciones complejas sin necesidad de aprender comandos específicos.

**Criterios de Aceptación:**
- **Dado** un mensaje de texto libre del usuario, **cuando** el bot lo recibe, **entonces** interpreta la intención usando lenguaje natural
- **Dado** que el bot necesita más información, **cuando** el usuario responde, **entonces** el bot mantiene el contexto de la sesión
- **Dado** una sesión activa, **cuando** pasan más de 5 minutos sin interacción, **entonces** la sesión expira y el bot vuelve al estado inicial

### US-006: Comandos reactivos
**Como** administrador,
**Quiero** comandos predefinidos como `/status`, `/incidents`, `/servers`, `/skills`, `/remediate`, `/run`,
**Para** acceder rápidamente a la información del sistema.

**Criterios de Aceptación:**
- **Dado** el comando `/status`, **cuando** se ejecuta, **entonces** devuelve estado general del sistema (servidores, incidentes activos, skills)
- **Dado** el comando `/incidents`, **cuando** se ejecuta, **entonces** lista los incidentes abiertos con severidad y servidor
- **Dado** el comando `/servers`, **cuando** se ejecuta, **entonces** lista los servidores gestionados con su estado
- **Dado** el comando `/skills`, **cuando** se ejecuta, **entonces** lista las skills disponibles
- **Dado** el comando `/remediate <id>`, **cuando** se ejecuta, **entonces** inicia remediación del incidente indicado
- **Dado** el comando `/run <comando>`, **cuando** se ejecuta, **entonces** ejecuta el comando en el servidor seleccionado

### US-007: Botones inline
**Como** administrador,
**Quiero** botones interactivos en las respuestas del bot,
**Para** ejecutar acciones con un solo toque.

**Criterios de Aceptación:**
- **Dado** una respuesta del bot con opciones, **cuando** se muestra, **entonces** incluye botones inline para acciones relevantes
- **Dado** un botón inline presionado, **cuando** Telegram envía el callback, **entonces** el bot procesa la acción y actualiza el mensaje
- **Dado** cualquier interacción por botón, **cuando** se completa, **entonces** el bot confirma la acción realizada

### US-008: Integración notification-service
**Como** sistema,
**Quiero** que Telegram sea un canal de notificaciones más,
**Para** recibir alertas de threshold, incidentes y actividades proactivas.

**Criterios de Aceptación:**
- **Dado** una configuración de notificación de tipo `telegram`, **cuando** se envía una alerta, **entonces** el mensaje llega al chat de Telegram configurado
- **Dado** múltiples canales configurados (webhook, email, telegram), **cuando** se dispara una alerta, **entonces** todos los canales reciben la notificación
- **Dado** un error en el canal Telegram, **cuando** falla el envío, **entonces** los demás canales no se ven afectados

---

## 📦 Nuevos archivos

```
src/services/telegram-service.ts  ← Bot conversacional completo (22KB)
```

## 📦 Nuevos endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/telegram/webhook` | POST | Recibe mensajes y comandos desde Telegram |
| `/api/telegram/set-webhook` | POST | Registra webhook del bot en Telegram API |
| `/api/telegram/test` | POST | Envía mensaje de prueba |

## 🔒 Seguridad

| Cambio | Detalle |
|---|---|
| JWT Middleware global | `app.use("/api", auth)` en línea 598, ANTES de todas las rutas protegidas |
| Rutas públicas | `/api/health`, `/api/setup/status`, `/api/setup/import`, `/api/admin/login` |
| Error handling | 401 → `{ error: "Authentication required" }`, 403 → `{ error: "Invalid or expired token" }` |
| Middleware duplicado | Eliminado el bloque viejo que no funcionaba por estar mal posicionado |
