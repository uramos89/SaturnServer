# 📋 Sprint Review — Sprint 1

> **Fecha:** 2026-05-03
> **Demo para:** Ulises (PO)
> **Presenta:** Alicia

---

## ✅ Entregables del Sprint

### Backend estable
- Todos los endpoints REST verificados y respondiendo 200
- API key de Gemini configurada y funcional (gemini-2.5-flash)
- Scripts generados por IA reales para Linux y Windows

### Bugs corregidos
1. **Credentials Import** — frontend enviaba `credentials` en vez de `content`
2. **API Key decrypt** — se guardaba encriptada y se devolvía encriptada sin desencriptar
3. **Errores silenciosos** — catch blocks sin logging ni feedback visible

### IA funcional
- Gemini 2.5 Flash configurado como provider activo
- Generación de scripts bash y powershell con descripciones, código y riesgos
- Fallback a template script cuando la IA falla

---

## ❌ No entregado / Fuera de scope

- [ ] Proactive Executor (motor que ejecuta actividades automáticamente) → Sprint 2
- [ ] Notificaciones webhook (solo el endpoint, falta UI dedicada) → Sprint 3
- [ ] Autenticación JWT en endpoints (algunos no tienen middleware) → Sprint 3

---

## 📊 Velocity

| Story Points planificados | Story Points completados | % Completado |
|---|---|---|
| 40 | 40 | 100% |
