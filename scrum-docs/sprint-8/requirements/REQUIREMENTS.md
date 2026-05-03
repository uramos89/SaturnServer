# 📋 SDLC — Requisitos
## sprint-8

## Requisitos Funcionales

- | Métrica | Valor |
- |---|---|
- | Skills creadas | 6 |
- | Total skills en DB | 16 |
- | Brechas del README cerradas | 6 |
- - **Dado** un servidor Linux, **cuando** se ejecuta la skill con `ACTION=list`, **entonces** devuelve los usuarios del sistema con UID, home y shell
- - **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=create` y `username`, **entonces** crea el usuario y establece el password
- - **Dado** un usuario existente, **cuando** se ejecuta con `ACTION=delete` y `username`, **entonces** elimina el usuario y su home directory
- - **Dado** un usuario existente, **cuando** se ejecuta con `ACTION=lock`, **entonces** bloquea la cuenta del usuario
- - **Dado** un usuario existente, **cuando** se ejecuta con `ACTION=add-group` y `groups`, **entonces** añade el usuario a los grupos indicados
- - **Dado** un servidor Linux con Nginx, **cuando** se ejecuta con `ACTION=list`, **entonces** devuelve los sitios configurados
- - **Dado** un servidor Linux con Nginx, **cuando** se ejecuta con `ACTION=create-site` y parámetros del dominio, **entonces** crea un virtual host y lo habilita
- - **Dado** un sitio existente, **cuando** se ejecuta con `ACTION=enable` o `disable`, **entonces** cambia el estado del sitio
- - **Dado** un cambio de configuración, **cuando** se ejecuta con `ACTION=test`, **entonces** verifica la sintaxis antes de aplicar
- - **Dado** un cambio válido, **cuando** se ejecuta con `ACTION=reload`, **entonces** recarga Nginx sin interrumpir conexiones activas
- - **Dado** un servidor Linux con Apache, **cuando** se ejecuta con `ACTION=list`, **entonces** devuelve los sitios y módulos activos
- - **Dado** un servidor Linux con Apache, **cuando** se ejecuta con `ACTION=create-site`, **entonces** crea un virtual host
- - **Dado** un sitio existente, **cuando** se ejecuta con `ACTION=enable/disable`, **entonces** cambia el estado del sitio
- - **Dado** un módulo de Apache, **cuando** se ejecuta con `ACTION=modules`, **entonces** lista los módulos cargados
- - **Dado** un servidor Windows con IIS, **cuando** se ejecuta con `ACTION=list`, **entonces** devuelve los sitios y su estado

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
