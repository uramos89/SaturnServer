# 🏃 Sprint 7 — Security Hardening Skills

> **Feature Reference:** EP-10 (Security Hardening), EP-11 (Health & Backup)
> **Duración:** 7 días
> **Sprint Goal:** Cerrar las brechas de seguridad del README: firewall, SSL, SSH hardening, SMART disk
> **Gap origin:** `scrum/releases/GAP_ANALYSIS.md` — 5 features del README no implementadas

---

## 🎯 Sprint Goal

Construir las 5 skills de seguridad faltantes para que el Proactive Executor pueda gestionar firewalls, certificados SSL, hardening SSH y monitoreo SMART disk.

---

## 📋 Backlog

| ID | Título | Prioridad | Esfuerzo | Dependencias |
|---|---|---|---|---|
| US-045 | Firewall Manager skill (iptables/ufw) | 🔥 Alta | 5 | Ninguna |
| US-046 | Windows Firewall skill | 🔥 Alta | 3 | Ninguna |
| US-047 | SSL/Certbot Manager skill | 🔥 Alta | 5 | Ninguna |
| US-048 | SSH Hardening skill | 🔥 Alta | 3 | Ninguna |
| US-049 | SMART Disk Monitor skill | 🟡 Media | 3 | Ninguna |

---

## 📦 Entregables

Cada skill incluirá:
- `SKILLS/<name>/skill.yaml` — Definición con parámetros y riesgos
- `SKILLS/<name>/script.sh` — Script bash ejecutable
- Registro en DB via API (POST /api/skills/import)

---

## 📊 Estimación

| Métrica | Valor |
|---|---|
| Story Points | 19 |
| Skills a crear | 5 |
