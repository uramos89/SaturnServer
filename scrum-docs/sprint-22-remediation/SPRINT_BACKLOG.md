# 🏃 Sprint 22 — Security Remediation

**Periodo:** 2026-05-03
**Objetivo:** Cerrar las 8 brechas de seguridad detectadas en la auditoría industrial.

---

## 📋 Backlog de Remediación

| Prioridad | ID | Hallazgo | Severidad | Esfuerzo | Estado |
|---|---|---|---|---|---|
| 🔴 P0 | C-003 | NoSQL Injection → HTTP 500 | 🟡 Medio | 15min | ⏳ Pendiente |
| 🔴 P0 | C-009 | SSRF a metadatos cloud | 🟡 Medio | 30min | ⏳ Pendiente |
| 🔴 P0 | C-010 | Protocol Smuggling → 500 | 🟡 Medio | 15min | ⏳ Pendiente |
| 🟡 P1 | C-004 | Unicode Path Traversal → 500 | 🟡 Medio | 15min | ⏳ Pendiente |
| 🟡 P1 | C-011 | Large payload sin límite | 🟡 Medio | 5min | ⏳ Pendiente |
| 🟡 P1 | C-012 | UTF-16 content-type → 500 | 🟡 Medio | 5min | ⏳ Pendiente |
| 🔵 P2 | C-006 | HSTS no configurado | 🔵 Bajo | 2min | ⏳ Pendiente |
| 🔵 P2 | C-007 | X-XSS-Protection deshabilitado | 🔵 Bajo | 1min | ⏳ Pendiente |
| 🔵 P2 | C-008 | Permissions-Policy ausente | 🔵 Bajo | 2min | ⏳ Pendiente |

---

## 📋 Items del Sprint

### P0-001: Validación tipo string + UTF-16 catch (C-003, C-012)
**Criterios:**
- Body con `{"username": {"$gt":""}}` → HTTP 400, no 500
- Body con `{"username": {}}` → HTTP 400, no 500
- Content-Type `utf-16` → HTTP 400, no 500

### P0-002: SSRF Protection (C-009)
**Criterios:**
- Host `169.254.169.254` → HTTP 400 (AWS metadata bloqueado)
- Host `metadata.google.internal` → HTTP 400
- Host `0x7f000001` / `2130706433` → HTTP 400
- IP privada sin server existente → HTTP 400

### P0-003: Protocol Smuggling (C-010)
**Criterios:**
- CRLF injection en body → HTTP 400
- Transfer-Encoding malformado → HTTP 400

### P1-004: Body limit + Unicode URL (C-011, C-004)
**Criterios:**
- Payload >1MB → HTTP 413
- URL con `%c0%ae%c0%ae` → HTTP 400

### P2-005: Security Headers (C-006, C-007, C-008)
**Criterios:**
- HSTS: `max-age=31536000; includeSubDomains`
- X-XSS-Protection: `1; mode=block`
- Permissions-Policy: `camera=(), microphone=(), geolocation=()`

---

## Plan de ataque

```
1. P0-001: express.json() error handler + typeof validation middleware
2. P0-002: IP blocklist en SSH connect endpoint
3. P0-003: SyntaxError handler ya existe, verificar cobertura
4. P1-004: express.json({ limit: '1mb' }) + URL decode try/catch
5. P2-005: helmet() config update
```

**Orden:** P0 → P1 → P2 (por severidad).
