# 📋 Scrum — Saturn Server

> Metodología Scrum adaptada al desarrollo de Saturn Server.
> Proyecto: https://github.com/uramos89/SaturnServer

---

## 📁 Estructura

```
scrum/
├── README.md                 ← Este archivo
├── backlog/
│   └── PRODUCT_BACKLOG.md    ← Todas las historias de usuario
├── sprint-1/
│   ├── SPRINT_BACKLOG.md     ← Items comprometidos en el sprint
│   ├── DAILY-01.md           ← Notas del daily standup
│   ├── SPRINT_REVIEW.md      ← Demo results al PO
│   └── RETROSPECTIVE.md      ← Qué mejorar
├── sprint-2/
│   └── SPRINT_PLANNING.md    ← Plan para el próximo sprint
└── releases/
    └── CHANGELOG.md          ← Release notes con versionado
```

## 🔄 Ceremonias

| Ceremonia | Frecuencia | Formato |
|---|---|---|
| Sprint Planning | Inicio de sprint | Documento en `sprint-N/SPRINT_PLANNING.md` |
| Daily Standup | Diario (hábiles) | `sprint-N/DAILY-NN.md` |
| Sprint Review | Fin de sprint | `sprint-N/SPRINT_REVIEW.md` |
| Retrospective | Fin de sprint | `sprint-N/RETROSPECTIVE.md` |

## 📏 Estimación

Usamos Story Points con escala Fibonacci (1, 2, 3, 5, 8, 13).

| Puntos | Significado |
|---|---|
| 1 | Cambio trivial (renombrar, fix simple) |
| 2 | Cambio pequeño (1-2 archivos, lógica simple) |
| 3 | Cambio mediano (varios archivos, lógica nueva) |
| 5 | Feature completo (nuevo endpoint + frontend) |
| 8 | Feature grande (nuevo módulo, integración) |
| 13 | Feature muy grande (épica, requiere sub-tareas) |

## 📐 Prioridades

| Etiqueta | Significado |
|---|---|
| 🔥 Alta | Bloqueante para el core del sistema |
| 🟡 Media | Importante pero no urgente |
| 🔵 Baja | Nice to have |
