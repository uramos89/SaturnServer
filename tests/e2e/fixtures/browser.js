// ── Browser Manager — Singleton reutilizable ──────────────────────────
import { chromium, firefox, webkit } from "playwright";
import { CONFIG, log } from "./config.js";

const ENGINES = { chromium, firefox, webkit };

let _browser = null;
let _context = null;
let _page = null;

/**
 * Inicializa el navegador y abre una página.
 * Solo crea un browser instance; todas las páginas subsecuentes
 * reusan el mismo context a menos que llames a newContext().
 */
export async function initBrowser() {
  const engine = ENGINES[CONFIG.browser];
  if (!engine) throw new Error(`Browser '${CONFIG.browser}' not supported. Use chromium|firefox|webkit`);

  log(`Launching ${CONFIG.browser} (headless: ${CONFIG.headless})...`);
  _browser = await engine.launch({
    headless: CONFIG.headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  _context = await _browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });

  _page = await _context.newPage();
  _page.setDefaultTimeout(CONFIG.timeouts.element);

  log(`Browser ready — ${_browser.version()}`);
  return _page;
}

/** Retorna la página activa */
export function page() {
  if (!_page) throw new Error("Browser not initialized. Call initBrowser() first.");
  return _page;
}

/** Crea un nuevo context + page (útil para testear multi-usuario) */
export async function newContext() {
  const ctx = await _browser.newContext();
  const pg = await ctx.newPage();
  pg.setDefaultTimeout(CONFIG.timeouts.element);
  return { context: ctx, page: pg };
}

/** Cierra el navegador y libera recursos */
export async function closeBrowser() {
  if (_page) try { await _page.close(); } catch {}
  if (_context) try { await _context.close(); } catch {}
  if (_browser) try { await _browser.close(); } catch {}
  _page = null;
  _context = null;
  _browser = null;
  log("Browser closed");
}

/** Toma un screenshot y devuelve la ruta */
export async function screenshot(name) {
  try {
    const path = `${CONFIG.reportDir}/${name}-${Date.now()}.png`;
    await _page.screenshot({ path, fullPage: true });
    return path;
  } catch {
    return null;
  }
}
