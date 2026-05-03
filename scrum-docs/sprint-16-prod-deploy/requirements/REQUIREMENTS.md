# 📋 SDLC — Requisitos
## sprint-16-prod-deploy

## Requisitos Funcionales

- - **Dado** el código actualizado en `.133`, **cuando** se ejecuta `npm run build`, **entonces** se genera `dist/` sin errores
- - **Dado** el build nuevo, **cuando** se copia a `.134:/home/ubuntu/saturn/dist/`, **entonces** reemplaza todos los archivos anteriores
- - **Dado** el nuevo build en `.134`, **cuando** se ejecuta `pm2 restart saturn`, **entonces** el proceso se reinicia sin errores
- - **Dado** el reinicio, **cuando** se consulta `GET /api/health`, **entonces** responde HTTP 200
- - **Dado** el reinicio, **cuando** se consulta `GET /`, **entonces** responde HTTP 200 (frontend)
- - **Dado** un PAT válido, **cuando** se configura en el remote de origin, **entonces** `git push origin main` funciona sin prompts
- - **Dado** cambios locales sin commit, **cuando** se ejecuta `git push`, **entonces** todos los cambios se suben al remoto
- - **Dado** el push completado, **cuando** se visita el repo en GitHub, **entonces** los commits nuevos aparecen en `main`
- - **Dado** el código fuente, **cuando** se auditan las primeras 2,700 líneas, **entonces** se documentan hallazgos en `saturn-audit/reports/`
- - **Dado** la auditoría, **cuando** se completa, **entonces** incluye: funcionalidades correctas, deuda técnica detectada y pendientes del README
- - **Dado** los 18 puntos del contrato, **cuando** se documentan en `CONTRACT.md`, **entonces** todas las reglas están escritas explícitamente
- - **Dado** el paper de ContextP, **cuando** se lee, **entonces** se entienden los conceptos: OBPA, contratos, memoria organizacional, cpini.md
- - **Dado** el entendimiento de ContextP, **cuando** se desarrolla, **entonces** las decisiones se alinean con los contratos
- - **Dado** `tesseract-ocr` instalado, **cuando** se ejecuta `tesseract imagen.jpg stdout`, **entonces** extrae texto de la imagen
- - **Dado** el código actualizado en `src/App.tsx`, **cuando** se importa `api` desde `./lib/utils`, **entonces** el import existe y es correcto
- - **Dado** el build desplegado, **cuando** un usuario hace clic en "Adopt New Node" e ingresa datos, **entonces** la llamada a `api()` se ejecuta sin error "api is not defined"
- - **Dado** los sprints 5 al 14, **cuando** se revisan, **entonces** cada US tiene criterios de aceptación en formato Given/When/Then
- - **Dado** los criterios de aceptación, **cuando** se escriben, **entonces** se basan en lo que la plataforma promete hacer
- - ⚠️ **BLOQUEADO:** Pendiente de que Ulises proporcione la key
- - **Dado** una key válida en `.env`, **cuando** ARES necesita IA, **entonces** puede invocar Gemini correctamente

## Criterios de Aceptación
Definidos en SPRINT_BACKLOG.md — cada US tiene Given/When/Then.
