# 📋 SDLC — Requisitos
## sprint-9

## Requisitos Funcionales

- - **Dado** cualquier acción administrativa (login, SSH, skill execution), **cuando** se registra en audit log, **entonces** incluye campo `_compliance` con estructura válida
- - **Dado** un log de auditoría con compliance, **cuando** se consulta, **entonces** incluye `gdpr.dataCategory`, `pci.scope` y `hipaa.ePHI`
- - **Dado** un evento de tipo NEURAL, **cuando** se registra, **entonces** el tag de compliance refleja` "dataCategory": "ai_generated"`
- - **Dado** el endpoint `GET /api/compliance/report`, **cuando** se invoca, **entonces** devuelve total de eventos y eventos con compliance tags
- - **Dado** eventos registrados, **cuando** se genera el reporte, **entonces** incluye conteo por tipo de evento
- - **Dado** eventos registrados, **cuando** se genera el reporte, **entonces** incluye cobertura GDPR, PCI e HIPAA
- - **Dado** eventos registrados, **cuando** se genera el reporte, **entonces** incluye los últimos 20 eventos con detalles
- - **Dado** una llamada a `logAudit()`, **cuando** se ejecuta, **entonces** el log incluye metadatos GDPR, PCI e HIPAA automáticamente
- - **Dado** un log sin compliance explícito, **cuando** se genera, **entonces** los valores por defecto son: `dataCategory: "system"`, `legalBasis: "legitimate_interest"`, `scope: "out_of_scope"`, `ePHI: false`
- - **Dado** gcloud CLI instalado, **cuando** se inicia un túnel IAP, **entonces** la conexión se establece a través de Identity-Aware Proxy
- - **⚠️ NOTA:** Pendiente de infraestructura (requiere gcloud CLI en producción)
- - **Dado** credenciales AWS configuradas, **cuando** se inicia una conexión Instance Connect, **entonces** se genera una clave temporal y se establece SSH
- - **⚠️ NOTA:** Pendiente de infraestructura AWS
- - Total eventos y eventos con compliance tags
- - Conteo por tipo y por evento
- - Cobertura GDPR, PCI, HIPAA
- - Últimos 20 eventos con detalles

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
