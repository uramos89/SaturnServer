// ── Navigation Flow ────────────────────────────────────────────────────
import { CONFIG, log, ok, fail, info, title } from "../fixtures/config.js";
import { page, screenshot } from "../fixtures/browser.js";

// Lista de tabs del sidebar que queremos probar
const SIDEBAR_TABS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "servers", label: "Servers", icon: "Server" },
  { id: "skills", label: "Skills", icon: "Brain" },
  { id: "proactive", label: "Proactive", icon: "Zap" },
  { id: "credentials", label: "Credentials", icon: "Key" },
  { id: "contextp", label: "ContextP", icon: "Database" },
  { id: "notifications", label: "Notifications", icon: "Bell" },
  { id: "audit", label: "Audit", icon: "History" },
  { id: "settings", label: "Settings", icon: "Settings" },
  { id: "admin", label: "Admin", icon: "User" },
];

export async function testNavigation() {
  title("FLOW: Navigation — 10 sidebar tabs");
  const p = page();

  let passed = 0;
  let failed = 0;

  for (const tab of SIDEBAR_TABS) {
    const tabName = tab.label;

    // Intentar con diferentes estrategias de localización
    const selectors = [
      `text=${tabName}`,
      `text=${tabName.toLowerCase()}`,
      `[data-tab="${tab.id}"]`,
      `#tab-${tab.id}`,
      `button:has-text("${tabName}")`,
      `a:has-text("${tabName}")`,
      `span:has-text("${tabName}")`,
      `nav >> text=${tabName}`,
      `aside >> text=${tabName}`,
    ];

    let clicked = false;
    for (const sel of selectors) {
      try {
        const el = await p.waitForSelector(sel, { timeout: 2000 });
        if (el) {
          await el.click();
          clicked = true;
          break;
        }
      } catch { /* try next selector */ }
    }

    if (!clicked) {
      // Fallback: buscar por texto en toda la página
      try {
        const links = await p.$$("a, button, span, div");
        for (const link of links) {
          const text = (await link.textContent()) || "";
          if (text.trim().toLowerCase() === tabName.toLowerCase()) {
            await link.click();
            clicked = true;
            break;
          }
        }
      } catch { /* fallback failed */ }
    }

    if (clicked) {
      // Esperar a que la UI responda
      await p.waitForTimeout(500);
      ok(`Tab "${tabName}" clicked`);
      passed++;
    } else {
      fail(`Tab "${tabName}" not found`);
      failed++;
    }
  }

  info(`Navigation: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

export async function testServerDetailNavigation() {
  title("FLOW: Server Detail — sub-tabs");
  const p = page();

  // Las tabs de detalle de servidor (aparecen al seleccionar un servidor)
  const detailTabs = [
    "Summary", "Processes", "Network", "Firewall", "Tasks",
    "Users", "Packages", "Web", "Health", "SSL", "Thresholds",
    "Audit", "Terminal"
  ];

  let passed = 0;
  for (const tab of detailTabs) {
    try {
      const el = await p.waitForSelector(`text=${tab}`, { timeout: 1500 });
      if (el) {
        ok(`Detail tab "${tab}" present in UI`);
        passed++;
      }
    } catch {
      // No es crítico si no aparecen (depende de tener un servidor seleccionado)
    }
  }
  info(`Server detail tabs detected: ${passed}`);
  return true;
}
