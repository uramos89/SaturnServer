// ── Saturn E2E Test Configuration ──────────────────────────────────────
// Ajusta estos valores según tu entorno.
// Puedes sobreescribirlos con variables de entorno.

export const CONFIG = {
  // URL base de Saturn Server (cámbiala si tu servidor es otro)
  baseUrl: process.env.SATURN_URL || "http://192.168.174.134:3000",

  // Credenciales de admin
  admin: {
    username: process.env.SATURN_USER || "admin",
    password: process.env.SATURN_PASS || "admin1",
  },

  // Navegador (chromium | firefox | webkit)
  browser: process.env.SATURN_BROWSER || "chromium",

  // Headless (true = sin ventana visible)
  headless: process.env.SATURN_HEADLESS !== "false",

  // Timeouts (en ms)
  timeouts: {
    navigation: parseInt(process.env.TIMEOUT_NAV || "10000"),
    element: parseInt(process.env.TIMEOUT_EL || "5000"),
    action: parseInt(process.env.TIMEOUT_ACT || "30000"),
  },

  // Reportes
  reportDir: "./reports",
  screenshotOnFail: true,
};

// ── Helpers de logging ─────────────────────────────────────────────────
const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

export function log(msg) {
  const ts = new Date().toISOString().split("T")[1].slice(0, 8);
  console.log(`${COLORS.dim}[${ts}]${COLORS.reset} ${msg}`);
}

export function ok(msg) {
  log(`${COLORS.green}✓${COLORS.reset} ${msg}`);
}

export function fail(msg) {
  log(`${COLORS.red}✗${COLORS.reset} ${msg}`);
}

export function info(msg) {
  log(`${COLORS.cyan}ℹ${COLORS.reset} ${msg}`);
}

export function title(msg) {
  console.log(`\n${COLORS.bold}${COLORS.yellow}═══ ${msg} ═══${COLORS.reset}\n`);
}

export function separator() {
  console.log(COLORS.dim + "─".repeat(60) + COLORS.reset);
}
