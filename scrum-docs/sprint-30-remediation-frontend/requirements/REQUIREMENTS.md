# 📋 SDLC — Requisitos
## sprint-30-remediation-frontend

## Requisitos Funcionales

- **Dado** que un endpoint devuelve `{error:"..."}` en vez de `[...]`, **cuando** se procesa la respuesta, **entonces** se valida con `Array.isArray()` antes de llamar a `.map()`
- **Dado** que un endpoint devuelve datos no-array, **cuando** se llama a `.filter()`, **entonces** se usa `(data || []).filter()` como safe fallback
- **Dado** el sidebar, **cuando** se hace clic en "ContextP Memory", **entonces** se navega a la vista de ContextP
- **Dado** las secciones Notifications y Admin, **cuando** se cargan, **entonces** no hay errores JS en consola
- **Dado** la pestaña Terminal, **cuando** se ingresa un comando, **entonces** se ejecuta vía API y muestra resultado sin perderse
- **Dado** la sesión del usuario, **cuando** hay inactividad por 15 minutos, **entonces** cierra la sesión automáticamente
- **Dado** un intento fallido de login, **cuando** se acumulan 5 fallos, **entonces** se bloquea la IP por 5 minutos
- **Dado** cualquier componente con API data, **cuando** se renderiza, **entonces** usa safe fallbacks con Array.isArray para todos los state setters

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
