import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

console.log('1. Navegando al login...');
await page.goto('http://192.168.174.134:3000', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'screenshots/01-login-screen.png' });
console.log('   Screenshot: 01-login-screen.png');

console.log('2. Ingresando credenciales...');
await page.fill('input[type="text"]', 'admin');
await page.fill('input[type="password"]', 'admin12345');
await page.screenshot({ path: 'screenshots/02-credenciales-llenadas.png' });

console.log('3. Click en Authenticate...');
await page.click('button:has-text("Authenticate")');
await page.waitForTimeout(5000);
await page.screenshot({ path: 'screenshots/03-despues-del-login.png' });

const text = await page.evaluate(() => document.body.innerText);
console.log('4. Texto visible en pantalla:');
console.log(text.substring(0, 500));

const url = page.url();
console.log('5. URL:', url);

const errorText = text.includes('Invalid') || text.includes('Error') || text.includes('error');
if (errorText) {
  console.log('❌ ERROR EN PANTALLA');
} else if (text.includes('SATURN') || text.includes('Dashboard') || text.includes('Servers')) {
  console.log('✅ LOGIN EXITOSO - Dashboard visible');
} else {
  console.log('⚠️  Login realizado - verificando estado...');
}

await browser.close();
