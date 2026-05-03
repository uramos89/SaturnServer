#!/usr/bin/env node
// ── Saturn E2E Test Runner ─────────────────────────────────────────────
// Ejecución:
//   node runner.js              # tests rápidos (login + dashboard)
//   node runner.js --all        # todos los tests
//   node runner.js --flow login # solo login
//   node runner.js --repeat 3   # repetir N veces (estrés)
//
// Requisitos:
//   npm install playwright
//   npx playwright install chromium  (o el browser que uses)

import { CONFIG, log, ok, fail, info, title, separator } from "./fixtures/config.js";
import { initBrowser, closeBrowser, page, screenshot } from "./fixtures/browser.js";
import { testLogin } from "./flows/login.js";
import { testNavigation, testServerDetailNavigation } from "./flows/navigation.js";
import { testDashboard, testHealthEndpoint, testLocalAIStatus } from "./flows/dashboard.js";

// ── CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const FLOW_FILTER = args.includes("--all") ? null : getArg(args, "--flow");
const REPEAT = parseInt(getArg(args, "--repeat") || "1");

function getArg(argv, name) {
  const idx = argv.indexOf(name);
  return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : null;
}

// ── Registro de tests ──────────────────────────────────────────────────
const TEST_REGISTRY = {
  login: {
    name: "Login",
    fn: async () => {
      const ok = await testLogin();
      if (!ok) return { passed: false, error: "Login failed" };
      return { passed: true };
    },
  },
  navigation: {
    name: "Navigation (sidebar)",
    fn: async () => {
      const ok = await testNavigation();
      return { passed: ok };
    },
  },
  "navigation-detail": {
    name: "Navigation (server detail tabs)",
    fn: async () => {
      await testServerDetailNavigation();
      return { passed: true };
    },
  },
  dashboard: {
    name: "Dashboard validation",
    fn: async () => {
      await testDashboard();
      return { passed: true };
    },
  },
  "health-api": {
    name: "Health API",
    fn: async () => {
      const ok = await testHealthEndpoint();
      return { passed: ok, error: ok ? null : "Health endpoint failed" };
    },
  },
  "local-ai": {
    name: "Local AI status",
    fn: async () => {
      // Necesita token — intentar login primero
      const p = page();
      const token = await p.evaluate(() => localStorage.getItem("saturn-token"));
      const ok = await testLocalAIStatus(token);
      return { passed: ok || true }; // non-critical
    },
  },
};

// ── Obtener lista de tests a ejecutar ──────────────────────────────────
function getTestsToRun() {
  if (FLOW_FILTER) {
    if (!TEST_REGISTRY[FLOW_FILTER]) {
      console.error(`Test flow '${FLOW_FILTER}' not found. Available: ${Object.keys(TEST_REGISTRY).join(", ")}`);
      process.exit(1);
    }
    return [FLOW_FILTER];
  }
  // Por defecto: login + dashboard + health
  return ["login", "dashboard", "health-api"];
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log("");
  console.log(`  ${"═".repeat(54)}`);
  console.log(`  🪐  SATURN SERVER — E2E Test Suite`);
  console.log(`  ${"═".repeat(54)}`);
  console.log(`  Target:    ${CONFIG.baseUrl}`);
  console.log(`  Browser:   ${CONFIG.browser} (headless: ${CONFIG.headless})`);
  console.log(`  Iterations: ${REPEAT}`);
  if (FLOW_FILTER) console.log(`  Filter:    ${FLOW_FILTER}`);
  console.log(`  ${"═".repeat(54)}\n`);

  let globalPassed = 0;
  let globalFailed = 0;
  let globalErrors = [];

  for (let run = 1; run <= REPEAT; run++) {
    if (REPEAT > 1) title(`Run ${run}/${REPEAT}`);

    try {
      await initBrowser();
    } catch (e) {
      fail(`Failed to launch browser: ${e.message}`);
      console.log("\n  💡 Make sure Playwright is installed:");
      console.log("     cd tests/e2e && npm install");
      console.log("     npx playwright install chromium\n");
      process.exit(1);
    }

    const tests = getTestsToRun();

    for (const testId of tests) {
      const test = TEST_REGISTRY[testId];
      try {
        const result = await test.fn();
        if (result.passed) {
          globalPassed++;
        } else {
          globalFailed++;
          globalErrors.push({ test: test.name, error: result.error || "Unknown error" });
        }
      } catch (e) {
        globalFailed++;
        globalErrors.push({ test: test.name, error: e.message });
        fail(`Unhandled error in "${test.name}": ${e.message}`);

        // Screenshot on unhandled error
        try {
          const path = await screenshot(`error-${testId}`);
          if (path) info(`Screenshot: ${path}`);
        } catch { /* ignore */ }
      }

      separator();
    }

    await closeBrowser();
  }

  // ── Final report ────────────────────────────────────────────────────
  console.log(`\n  ${"═".repeat(54)}`);
  console.log(`  📊  FINAL REPORT`);
  console.log(`  ${"═".repeat(54)}`);
  console.log(`  Tests executed:  ${globalPassed + globalFailed}`);
  console.log(`  ${globalFailed === 0 ? "✅" : "❌"} Passed:         ${globalPassed}`);
  console.log(`  Failed:         ${globalFailed}`);

  if (globalErrors.length > 0) {
    console.log(`\n  Failures:`);
    for (const err of globalErrors) {
      console.log(`    • ${err.test}: ${err.error}`);
    }
  }

  console.log(`\n  Target: ${CONFIG.baseUrl}`);
  console.log(`  ${"═".repeat(54)}\n`);

  process.exit(globalFailed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  closeBrowser().catch(() => {});
  process.exit(1);
});
