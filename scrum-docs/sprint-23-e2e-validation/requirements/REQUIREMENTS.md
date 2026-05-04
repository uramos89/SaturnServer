# 📋 SDLC — Requisitos
## sprint-23-e2e-validation

## Requisitos Funcionales

- **Dado** el test lab, **cuando** se prepara, **entonces** 4 contenedores SSH son accesibles desde Saturn
- **Dado** Saturn con test lab, **cuando** se hace login desde frontend, **entonces** la navegación funciona
- **Dado** el dashboard, **cuando** se cargan stats, **entonces** muestra servidores correctamente
- **Dado** la UI de añadir nodo, **cuando** se ingresa un servidor SSH del test lab, **entonces** el nodo se agrega y muestra telemetría
- **Dado** el Neural Engine, **cuando** se ejecuta un comando, **entonces** devuelve resultado
- **Dado** Skills Library, **cuando** se navega, **entonces** muestra skills ejecutables
- **Dado** SSRF protection, **cuando** se conecta a metadata IPs, **entonces** bloquea (HTTP 400)
- **Dado** SSRF protection, **cuando** se conecta a IP privada válida, **entonces** permite la conexión
- **Dado** Playwright E2E suite, **cuando** se ejecuta, **entonces** 3/3 tests pasan

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
