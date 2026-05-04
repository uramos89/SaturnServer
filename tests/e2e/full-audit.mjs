import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const DIR = 'screenshots/full-audit';
mkdirSync(DIR, { recursive: true });
const BASE = 'http://192.168.174.134:3000';

let step = 0;
async function snap(page, name) {
  step++;
  const path = join(DIR, `${String(step).padStart(2,'0')}-${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  [${step}] ${name}`);
  return path;
}

async function clickAndSnap(page, selector, name) {
  try {
    await page.click(selector, { timeout: 5000 });
    await page.waitForTimeout(2000);
    await snap(page, name);
    return true;
  } catch(e) {
    console.log(`  ❌ No se pudo hacer clic en "${selector}": ${e.message.substring(0,80)}`);
    return false;
  }
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

console.log('\n═══════════════════════════════════════');
console.log('  AUDITORÍA VISUAL COMPLETA - FRONTEND');
console.log('═══════════════════════════════════════\n');

// ── 1. LOGIN ──
console.log('--- 1. LOGIN ---');
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);
await snap(page, '01-login-screen');
await page.fill('input[type="text"]', 'admin');
await page.fill('input[type="password"]', 'admin12345');
await snap(page, '02-credenciales-llenadas');
await page.click('button');
await page.waitForTimeout(8000);

// ── 2. DASHBOARD ──
console.log('\n--- 2. DASHBOARD ---');
await snap(page, '03-dashboard');
const dashText = await page.evaluate(() => document.body.innerText);
console.log('  Dashboard text:', dashText.substring(0, 200).replace(/\n/g, ' | '));

// ── 3. NAVEGACIÓN POR SIDEBAR ──
console.log('\n--- 3. SIDEBAR TABS ---');
const tabs = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'servers', label: 'Managed Nodes' },
  { name: 'skills', label: 'Expert Skills' },
  { name: 'proactive', label: 'Proactive Engine' },
  { name: 'credentials', label: 'Identity Vault' },
  { name: 'contextp', label: 'ContextP Memory' },
  { name: 'notifications', label: 'nav.notifications' },
  { name: 'audit', label: 'Audit Logs' },
  { name: 'settings', label: 'System Settings' },
  { name: 'admin', label: 'Administration' },
];
for (const tab of tabs) {
  console.log(`  Click: ${tab.label}`);
  await clickAndSnap(page, `text=${tab.name}`, `04-tab-${tab.name}`);
}

// ── 4. ADD NODE MODAL ──
console.log('\n--- 4. ADD NODE MODAL ---');
const addBtn = await page.$('button:has-text("Add Node")');
if (addBtn) {
  await addBtn.click();
  await page.waitForTimeout(1500);
  await snap(page, '05-add-node-modal');
  
  // Fill the form
  const inputs = await page.$$('input');
  if (inputs.length >= 3) {
    await inputs[0].fill('192.168.174.133');
    // Port field - check if visible
    await page.waitForTimeout(500);
    await snap(page, '05b-ip-filled');
    
    // Try to fill port
    const portInput = await page.$('input[placeholder="22"]');
    if (portInput) {
      await portInput.fill('2222');
      console.log('  ✅ Port field found and filled');
    } else {
      console.log('  ⚠️  Port field not found');
    }
  }
  
  // Close modal
  const closeBtn = await page.$('button:has-text("Cancel")');
  if (closeBtn) await closeBtn.click();
  await page.waitForTimeout(500);
}

// ── 5. SETTINGS ──
console.log('\n--- 5. SETTINGS ---');
await clickAndSnap(page, 'text=settings', '06-settings');
// Click through settings options if available
const settingsBtns = await page.$$('button');
for (const btn of settingsBtns) {
  const text = await btn.textContent();
  if (text && text.includes('Save')) {
    console.log('  Found Save button in settings');
    break;
  }
}

// ── 6. SKILLS ──
console.log('\n--- 6. SKILLS ---');
await clickAndSnap(page, 'text=skills', '07-skills-listing');

// ── 7. PROACTIVE ──
console.log('\n--- 7. PROACTIVE ---');
await clickAndSnap(page, 'text=proactive', '08-proactive-engine');

// ── 8. AUDIT ──
console.log('\n--- 8. AUDIT ---');
await clickAndSnap(page, 'text=audit', '09-audit-logs');

// ── 9. CONTEXTP ──
console.log('\n--- 9. CONTEXTP ---');
await clickAndSnap(page, 'text=contextp', '10-contextp');

// ── FINAL ──
console.log('\n═══════════════════════════════════════');
console.log(`  AUDITORÍA COMPLETA - ${step} capturas`);
console.log('═══════════════════════════════════════\n');

// Generate HTML report
const report = `
<html><body style="font-family:sans-serif;background:#111;color:#eee;padding:20px">
<h1>🧪 Visual Audit - Saturn Server Frontend</h1>
<p>${step} screenshots | ${new Date().toISOString()}</p>
${Array.from({length: step}, (_, i) => {
  const num = String(i+1).padStart(2,'0');
  const files = require('fs').readdirSync(DIR).filter(f => f.startsWith(num));
  return files.map(f => `<div style="margin:20px 0"><strong>${f.replace('.png','')}</strong><br><img src="${f}" style="max-width:100%;border:1px solid #333;border-radius:8px"></div>`).join('\n');
}).join('\n')}
</body></html>`;

writeFileSync(join(DIR, 'report.html'), report);
console.log(`  Report: ${join(DIR, 'report.html')}`);

await browser.close();
