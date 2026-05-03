# 📋 SDLC — Requisitos
## sprint-7

## Requisitos Funcionales

- | Métrica | Valor |
- |---|---|
- | Skills creadas | 5 |
- | Total skills en DB | 10 |
- | Brechas del README cerradas | 5 |
- - **Dado** un servidor Linux con ufw/iptables, **cuando** se ejecuta la skill con `ACTION=list`, **entonces** devuelve las reglas activas
- - **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=allow` y un puerto, **entonces** se añade la regla de permitir
- - **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=deny` y un puerto, **entonces** se añade la regla de denegar
- - **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=enable`, **entonces** se activa el firewall
- - **Dado** cualquier cambio en las reglas, **cuando** se completa, **entonces** persiste después de reinicio del servidor
- - **Dado** un servidor Windows, **cuando** se ejecuta la skill con `ACTION=list`, **entonces** devuelve las reglas activas
- - **Dado** un servidor Windows, **cuando** se ejecuta con `ACTION=allow` y un puerto/programa, **entonces** se crea la regla
- - **Dado** un servidor Windows, **cuando** se ejecuta con `ACTION=status`, **entonces** devuelve el estado del firewall
- - **Dado** un servidor Linux con Certbot, **cuando** se ejecuta con `ACTION=list`, **entonces** devuelve los certificados instalados
- - **Dado** un dominio configurado, **cuando** se ejecuta con `ACTION=obtain` y un dominio, **entonces** obtiene un certificado SSL válido
- - **Dado** un certificado próximo a expirar, **cuando** se ejecuta con `ACTION=renew`, **entonces** renueva los certificados activos
- - **Dado** un certificado existente, **cuando** se ejecuta con `ACTION=expiry`, **entonces** devuelve la fecha de expiración
- - **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=audit`, **entonces** devuelve un reporte de la configuración SSH actual
- - **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=root-disable`, **entonces** deshabilita el login root por SSH
- - **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=port-rotate` y un puerto, **entonces** cambia el puerto SSH

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
