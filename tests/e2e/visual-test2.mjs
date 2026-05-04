import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto('http://192.168.174.134:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Fill and submit
await page.fill('input[type="text"]', 'admin');
await page.fill('input[type="password"]', 'admin12345');
await page.click('button:has-text("Authenticate")');
await page.waitForTimeout(8000);

const text = await page.evaluate(() => document.body.innerText);
console.log('TEXTO EN PANTALLA:');
console.log(text.substring(0, 1000));
console.log('---');
console.log('Login exitoso?', text.includes('Dashboard') || text.includes('SATURN') || text.includes('Servers') || text.includes('Nodos'));

await browser.close();
