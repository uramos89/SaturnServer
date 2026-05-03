# 🧪 Saturn E2E Tests — Playwright

Sistema de pruebas automatizadas end-to-end para Saturn Server usando Playwright en modo headless.

## 📋 Requisitos

```bash
# Node.js 18+ y npm
node --version

# Instalar dependencias
cd tests/e2e
npm install

# Instalar navegador (chromium recomendado)
npx playwright install chromium
```

## 🚀 Ejecución

```bash
# Tests rápidos (login + dashboard + health)
node runner.js

# Todos los tests
node runner.js --all

# Solo un flujo específico
node runner.js --flow login
node runner.js --flow navigation
node runner.js --flow dashboard
node runner.js --flow health-api
node runner.js --flow local-ai

# Repetir N veces (test de estrés)
node runner.js --repeat 3
```

## 🔧 Configuración

Variables de entorno (opcional — por defecto apunta a producción):

```bash
# URL del servidor Saturn
export SATURN_URL=http://192.168.174.134:3000

# Credenciales
export SATURN_USER=admin
export SATURN_PASS=admin1

# Navegador (chromium | firefox | webkit)
export SATURN_BROWSER=chromium

# Mostrar navegador visible (desactivar headless)
export SATURN_HEADLESS=false

# Timeouts (ms)
export TIMEOUT_NAV=15000
export TIMEOUT_EL=5000
export TIMEOUT_ACT=30000
```

## 🏗️ Estructura

```
tests/e2e/
├── runner.js           ← Punto de entrada. Orquesta los tests.
├── package.json        ← Dependencias (playwright)
├── README.md           ← Esta guía
│
├── fixtures/
│   ├── config.js       ← Configuración, logging, colores
│   └── browser.js      ← Singleton del navegador (init/close/screenshot)
│
├── flows/
│   ├── login.js        ← Login flow multi-selector
│   ├── navigation.js   ← Sidebar + server detail tabs
│   └── dashboard.js    ← Dashboard + health + local AI
│
└── reports/            ← Screenshots en fallo (auto-generado)
```

## ➕ Agregar nuevos tests

1. Crear un archivo en `flows/`:

```js
// flows/mi-test.js
import { ok, fail, title } from "../fixtures/config.js";

export async function testMiFeature() {
  title("FLOW: Mi Feature");
  const p = page(); // página activa del browser

  // Tu lógica aquí
  const title = await p.title();
  if (title) {
    ok("Título cargado");
    return true;
  }
  fail("Sin título");
  return false;
}
```

2. Registrar en `runner.js`:

```js
import { testMiFeature } from "./flows/mi-test.js";

const TEST_REGISTRY = {
  // ... tests existentes ...
  "mi-feature": {
    name: "Mi Feature",
    fn: async () => {
      const ok = await testMiFeature();
      return { passed: ok };
    },
  },
};
```

## 🌐 Multi-plataforma

El sistema soporta los 3 engines de Playwright:

```bash
SATURN_BROWSER=chromium  node runner.js   # Google Chrome (default)
SATURN_BROWSER=firefox   node runner.js   # Mozilla Firefox
SATURN_BROWSER=webkit    node runner.js   # Apple Safari (WebKit)
```

Los selectores en los tests intentan múltiples estrategias (texto, atributos, roles) para ser compatibles con cambios en la UI sin modificar el test.
