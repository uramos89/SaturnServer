# 📋 SDLC — Requisitos
## sprint-5

## Requisitos Funcionales

- | Métrica | Valor |
- |---|---|
- | Total US planificadas | 8 |
- | Completadas | 8 |
- - **Dado** un endpoint protegido (ej. `/api/servers`), **cuando** se invoca sin token JWT, **entonces** responde HTTP 401 con `{ error: "Authentication required" }`
- - **Dado** un endpoint protegido, **cuando** se invoca con token JWT expirado o inválido, **entonces** responde HTTP 403 con `{ error: "Invalid or expired token" }`
- - **Dado** un endpoint público (`/api/health`, `/api/setup/status`, `/api/admin/login`), **cuando** se invoca sin token, **entonces** responde correctamente sin requerir autenticación
- - **Dado** un token JWT válido, **cuando** se invoca cualquier endpoint protegido, **entonces** el middleware valida el token y permite el acceso
- - **Dado** que un path está definido como público, **cuando** se accede a `GET /api/health`, **entonces** no se requiere token JWT
- - **Dado** que un path está definido como público, **cuando** se accede a `POST /api/admin/login`, **entonces** no se requiere token JWT
- - **Dado** cualquier otro path bajo `/api/`, **cuando** se accede sin autenticación, **entonces** se rechaza con 401
- - **Dado** una solicitud sin token, **cuando** el middleware rechaza, **entonces** la respuesta es JSON con `{ error: "Authentication required" }`
- - **Dado** una solicitud con token inválido, **cuando** el middleware rechaza, **entonces** la respuesta es JSON con `{ error: "Invalid or expired token" }`
- - **Dado** cualquier error de autenticación, **cuando** se envía la respuesta, **entonces** el Content-Type es `application/json`
- - **Dado** que el bot está configurado con un token válido, **cuando** se envía un mensaje a `POST /api/telegram/webhook`, **entonces** el bot procesa el mensaje y responde
- - **Dado** que el bot está configurado, **cuando** se invoca `POST /api/telegram/set-webhook`, **entonces** registra el webhook en la API de Telegram y devuelve éxito
- - **Dado** que el bot está configurado, **cuando** se invoca `POST /api/telegram/test`, **entonces** envía un mensaje de prueba y devuelve el resultado
- - **Dado** cualquier error de conexión con Telegram, **cuando** se intenta enviar un mensaje, **entonces** el error se captura y registra sin colapsar el servicio
- - **Dado** un mensaje de texto libre del usuario, **cuando** el bot lo recibe, **entonces** interpreta la intención usando lenguaje natural
- - **Dado** que el bot necesita más información, **cuando** el usuario responde, **entonces** el bot mantiene el contexto de la sesión

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
