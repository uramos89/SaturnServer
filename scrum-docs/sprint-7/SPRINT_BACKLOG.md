# 🏃 Sprint 7 — Security Hardening Skills (Completado ✅)

> **Feature Reference:** EP-10 (Security Hardening), EP-11 (Health & Backup)
> **Gap origin:** `scrum/releases/GAP_ANALYSIS.md` — 5 features del README implementadas

---

## 📊 Sprint Metrics

| Métrica | Valor |
|---|---|
| Skills creadas | 5 |
| Total skills en DB | 10 |
| Brechas del README cerradas | 5 |

---

## 📋 Items del Sprint con Criterios de Aceptación

### US-001: Firewall Manager (iptables/ufw)
**Como** administrador,
**Quiero** gestionar reglas de firewall en servidores Linux,
**Para** asegurar los puertos y servicios expuestos.

**Criterios de Aceptación:**
- **Dado** un servidor Linux con ufw/iptables, **cuando** se ejecuta la skill con `ACTION=list`, **entonces** devuelve las reglas activas
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=allow` y un puerto, **entonces** se añade la regla de permitir
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=deny` y un puerto, **entonces** se añade la regla de denegar
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=enable`, **entonces** se activa el firewall
- **Dado** cualquier cambio en las reglas, **cuando** se completa, **entonces** persiste después de reinicio del servidor

### US-002: Windows Firewall Manager
**Como** administrador,
**Quiero** gestionar reglas de firewall en servidores Windows,
**Para** asegurar puertos y servicios en entornos Windows.

**Criterios de Aceptación:**
- **Dado** un servidor Windows, **cuando** se ejecuta la skill con `ACTION=list`, **entonces** devuelve las reglas activas
- **Dado** un servidor Windows, **cuando** se ejecuta con `ACTION=allow` y un puerto/programa, **entonces** se crea la regla
- **Dado** un servidor Windows, **cuando** se ejecuta con `ACTION=status`, **entonces** devuelve el estado del firewall

### US-003: SSL/Certbot Manager
**Como** administrador,
**Quiero** gestionar certificados SSL con Certbot en servidores Linux,
**Para** mantener sitios web seguros.

**Criterios de Aceptación:**
- **Dado** un servidor Linux con Certbot, **cuando** se ejecuta con `ACTION=list`, **entonces** devuelve los certificados instalados
- **Dado** un dominio configurado, **cuando** se ejecuta con `ACTION=obtain` y un dominio, **entonces** obtiene un certificado SSL válido
- **Dado** un certificado próximo a expirar, **cuando** se ejecuta con `ACTION=renew`, **entonces** renueva los certificados activos
- **Dado** un certificado existente, **cuando** se ejecuta con `ACTION=expiry`, **entonces** devuelve la fecha de expiración

### US-004: SSH Hardening
**Como** administrador,
**Quiero** endurecer la configuración SSH de los servidores,
**Para** prevenir accesos no autorizados.

**Criterios de Aceptación:**
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=audit`, **entonces** devuelve un reporte de la configuración SSH actual
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=root-disable`, **entonces** deshabilita el login root por SSH
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=port-rotate` y un puerto, **entonces** cambia el puerto SSH
- **Dado** un cambio de puerto SSH, **cuando** se completa, **entonces** el servicio SSH se reinicia y el nuevo puerto está activo
- **Dado** la ejecución de hardening SSH, **cuando** hay una conexión activa, **entonces** no se pierde la conexión actual

### US-005: SMART Disk Monitor
**Como** administrador,
**Quiero** monitorear la salud de los discos vía SMART,
**Para** detectar fallos de disco antes de que ocurran.

**Criterios de Aceptación:**
- **Dado** un servidor Linux con SMART habilitado, **cuando** se ejecuta con `ACTION=check`, **entonces** devuelve el estado general del disco
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=temperature`, **entonces** devuelve la temperatura del disco
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=errors`, **entonces** devuelve los errores SMART acumulados
- **Dado** un servidor Linux, **cuando** se ejecuta con `ACTION=health`, **entonces** devuelve "PASS" o "FAIL" según SMART

---

## 📦 Skills exportables

| Skill | Acciones | OS |
|---|---|---|
| 🛡️ Firewall Manager | list, allow, deny, delete, enable, disable | Linux (ufw/iptables) |
| 🪟 Windows Firewall Manager | list, allow, deny, delete, status | Windows |
| 🔐 SSL Certbot Manager | list, obtain, renew, expiry, revoke | Linux |
| 🔒 SSH Hardening | audit, apply, port-rotate, key-only, root-disable, report | Linux |
| 💾 SMART Disk Monitor | check, all, temperature, errors, health, list | Linux |
