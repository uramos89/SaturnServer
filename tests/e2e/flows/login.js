// ── Login Flow ─────────────────────────────────────────────────────────
import { CONFIG, log, ok, fail, info, title } from "../fixtures/config.js";
import { page, screenshot } from "../fixtures/browser.js";

export async function testLogin() {
  title("FLOW: Login");
  const p = page();
  const { username, password } = CONFIG.admin;

  // 1. Navegar a Saturn
  info(`Navigating to ${CONFIG.baseUrl}...`);
  await p.goto(CONFIG.baseUrl, { waitUntil: "networkidle", timeout: CONFIG.timeouts.navigation });

  // 2. Verificar que carga (login screen o dashboard)
  const bodyText = await p.textContent("body");
  if (bodyText.includes("SATURN") || bodyText.includes("Login") || bodyText.includes("login")) {
    ok("Page loaded — Saturn UI detected");
  } else {
    fail("Page loaded but Saturn UI not detected");
    if (CONFIG.screenshotOnFail) await screenshot("login-page-load");
    return false;
  }

  // 3. Buscar el formulario de login
  //    Probamos 3 posibles selectores para ser multi-versión
  let usernameInput = null;
  const selectors = [
    'input[type="text"]',
    'input[placeholder*="user" i]',
    'input[placeholder*="name" i]',
    'input[name="username"]',
    'input#username',
  ];

  for (const sel of selectors) {
    try {
      usernameInput = await p.waitForSelector(sel, { timeout: 3000 });
      if (usernameInput) break;
    } catch { /* try next */ }
  }

  if (!usernameInput) {
    // Podría ya estar logueado → verificar dashboard
    info("No login form found — checking if already authenticated...");
    try {
      await p.waitForSelector("text=SATURN", { timeout: 3000 });
      ok("Already logged in — dashboard visible");
      return true;
    } catch {
      fail("Login form not found and not authenticated");
      if (CONFIG.screenshotOnFail) await screenshot("login-not-found");
      return false;
    }
  }

  // 4. Ingresar credenciales
  info(`Logging in as ${username}...`);

  // Buscar el input de password
  const passwordInput = await p.$('input[type="password"]');
  if (!passwordInput) {
    fail("Password field not found");
    if (CONFIG.screenshotOnFail) await screenshot("login-no-password");
    return false;
  }

  await usernameInput.fill(username);
  await passwordInput.fill(password);

  // 5. Buscar y hacer clic en el botón de login
  const loginButton = await p.$('button[type="submit"], button:has-text("Login"), button:has-text("login"), button:has-text("Sign"), button:has-text("sign")');
  if (loginButton) {
    await loginButton.click();
  } else {
    // Si no hay botón, intentar Enter
    await p.keyboard.press("Enter");
  }

  // 6. Esperar que el dashboard cargue
  try {
    await p.waitForFunction(
      () => document.title && (document.title.includes("Saturn") || document.title.includes("saturn")),
      { timeout: CONFIG.timeouts.action }
    );
  } catch { /* some SPAs don't set title */ }

  // Verificar por texto en página
  try {
    await p.waitForFunction(
      (expected) => {
        const text = document.body?.innerText || "";
        return text.includes(expected) || text.includes("Dashboard") || text.includes("SATURN");
      },
      "SATURN",
      { timeout: CONFIG.timeouts.action }
    );
    ok(`Login successful (${username})`);
    return true;
  } catch {
    fail("Login failed — dashboard did not load");
    if (CONFIG.screenshotOnFail) await screenshot("login-failed");

    // Capturar mensaje de error si existe
    try {
      const errEl = await p.$("text=/error|fail|invalid/i");
      if (errEl) {
        const errText = await errEl.textContent();
        info(`Error message on page: "${errText.substring(0, 100)}"`);
      }
    } catch { /* ignore */ }
    return false;
  }
}
