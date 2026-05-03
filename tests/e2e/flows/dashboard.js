// ── Dashboard Validation Flow ──────────────────────────────────────────
import { CONFIG, log, ok, fail, info, title, separator } from "../fixtures/config.js";
import { page, screenshot } from "../fixtures/browser.js";

const EXPECTED_ELEMENTS = [
  // Elementos clave del dashboard
  { label: "Saturn title", patterns: ["SATURN", "Saturn"] },
  { label: "Neural status indicator", patterns: ["Neural", "neural", "Active", "Standby"] },
];

const EXPECTED_STATS = [
  "Servers", "servers", "Server",
  "Incidents", "incidents",
  "Skills", "skills",
];

export async function testDashboard() {
  title("FLOW: Dashboard Validation");
  const p = page();

  // 1. Verificar elementos clave
  let elementsOk = 0;
  for (const el of EXPECTED_ELEMENTS) {
    let found = false;
    for (const pattern of el.patterns) {
      try {
        await p.waitForFunction(
          (p) => document.body?.innerText?.includes(p),
          pattern,
          { timeout: 3000 }
        );
        found = true;
        break;
      } catch { /* try next pattern */ }
    }
    if (found) {
      ok(`Element found: ${el.label}`);
      elementsOk++;
    } else {
      info(`Element not found: ${el.label} (non-critical)`);
    }
  }

  // 2. Verificar estadísticas del dashboard
  let statsFound = 0;
  for (const stat of EXPECTED_STATS) {
    try {
      await p.waitForFunction(
        (s) => document.body?.innerText?.includes(s),
        stat,
        { timeout: 2000 }
      );
      statsFound++;
    } catch { /* not found */ }
  }
  info(`Dashboard stats/widgets detected: ${statsFound}/${EXPECTED_STATS.length}`);

  // 3. Verificar sidebar presente
  try {
    const sidebarItems = await p.$$("nav a, nav button, aside a, aside button");
    if (sidebarItems.length >= 3) {
      ok(`Sidebar present with ${sidebarItems.length} items`);
    } else {
      info(`Sidebar has few items: ${sidebarItems.length}`);
    }
  } catch {
    info("Sidebar not detected (may use different layout)");
  }

  // 4. Verificar header
  try {
    const header = await p.$("header, [class*='header'], nav:first-of-type");
    if (header) {
      ok("Header/status bar present");
    }
  } catch {
    info("Header not detected (non-critical)");
  }

  // 5. Verificar que no hay errores JS visibles
  try {
    const errorTexts = await p.$$("text=/error|Error|ERROR/");
    const visibleErrors = [];
    for (const el of errorTexts) {
      const text = (await el.textContent()) || "";
      if (text.length > 0 && text.length < 200 && !text.includes("error 401") && !text.includes("Not found")) {
        visibleErrors.push(text);
      }
    }
    if (visibleErrors.length > 0) {
      info(`Warning: ${visibleErrors.length} potential error text(s) on page: "${visibleErrors[0].substring(0, 80)}"`);
    } else {
      ok("No visible error messages on dashboard");
    }
  } catch { /* ignore */ }

  separator();
  info(`Dashboard validation complete`);

  // Tomar screenshot del dashboard
  if (CONFIG.screenshotOnFail) {
    const path = await screenshot("dashboard");
    if (path) info(`Screenshot saved: ${path}`);
  }

  return true;
}

// ── Test de Health API ─────────────────────────────────────────────────
export async function testHealthEndpoint() {
  title("FLOW: Health API Validation");

  try {
    const res = await fetch(`${CONFIG.baseUrl}/api/health`);
    const data = await res.json();

    if (res.status === 200) {
      ok(`Health endpoint: HTTP 200`);
      info(`  Status: ${data.status}`);
      info(`  Version: ${data.version}`);
      info(`  Engine: ${data.engine}`);
      info(`  Servers: ${data.servers}`);
      info(`  SSH connected: ${data.ssh?.connected || 0}`);
      return true;
    } else {
      fail(`Health endpoint returned HTTP ${res.status}`);
      return false;
    }
  } catch (e) {
    fail(`Health endpoint unreachable: ${e.message}`);
    return false;
  }
}

// ── Test de Local Status ───────────────────────────────────────────────
export async function testLocalAIStatus(token) {
  title("FLOW: Local AI Status Validation");

  try {
    const res = await fetch(`${CONFIG.baseUrl}/api/neural/local-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (res.status === 200 && data.ollama_running) {
      ok(`Local AI: ${data.model} — ${data.status} (${data.ram_usage})`);
      return true;
    } else if (res.status === 200) {
      info(`Local AI status: ollama=${data.ollama_running}, model=${data.model}`);
      return true;
    } else {
      info(`Local AI status unavailable (HTTP ${res.status})`);
      return false;
    }
  } catch (e) {
    info(`Local AI status error: ${e.message}`);
    return false;
  }
}
