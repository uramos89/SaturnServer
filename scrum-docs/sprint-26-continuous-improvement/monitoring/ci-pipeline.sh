#!/bin/bash
# 🪐 Saturn CI/CD Pipeline — Mejora Continua
# Ejecutar: bash ci-pipeline.sh

echo "═══ SATURN CI/CD PIPELINE ═══"
echo ""

echo "▶ Fase 1: SAST (Análisis estático)"
cd /home/ubuntu/.openclaw/workspace/SaturnServer
npm run lint:security 2>&1 | tail -5
echo ""

echo "▶ Fase 2: SCA (Dependencias)"
npm audit 2>&1 | grep -E "critical|high|vulnerabilit" | head -5
echo ""

echo "▶ Fase 3: Tests unitarios"
npx vitest run 2>&1 | tail -3
echo ""

echo "▶ Fase 4: DAST (Pruebas dinámicas)"
cd /home/ubuntu/.openclaw/workspace/saturn-audit/compliance
python3 scripts/saturn-security-suite.py 2>&1 | grep -E "Score|Hallazgos|Críticos|Bloqueados|AUDITORÍA COMPLETA"
echo ""

echo "▶ Fase 5: E2E (Playwright)"
cd /home/ubuntu/.openclaw/workspace/SaturnServer/tests/e2e
PLAYWRIGHT_CHROMIUM_USE_HEADLESS_SHELL=false SATURN_URL=http://192.168.174.134:3000 node runner.js 2>&1 | grep -E "Passed|Failed"
echo ""

echo "═══ PIPELINE COMPLETADO ═══"
