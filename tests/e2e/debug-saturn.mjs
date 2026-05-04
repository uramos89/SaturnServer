import { chromium } from 'playwright';
import { execSync } from 'child_process';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];

page.on('console', msg => {
  if (msg.type() === 'error') errors.push('[CONSOLE] ' + msg.text().substring(0, 300));
});
page.on('pageerror', err => errors.push('[PAGE] ' + err.message.substring(0, 300)));

try {
  await page.goto('http://192.168.174.134:3000', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
} catch(e) {
  errors.push('[NAV] ' + e.message);
}

console.log('\n=== ERRORS ===');
console.log('Count:', errors.length);
errors.forEach(e => console.log('  ' + e));

const info = await page.evaluate(() => {
  const root = document.getElementById('root');
  const rootStyle = root ? getComputedStyle(root).display : 'NO_ROOT';
  const rootHTML = root ? root.innerHTML.substring(0, 200) : '';
  const bodyChildren = document.body.children.length;
  return { rootStyle, rootHTML, bodyChildren, url: location.href, title: document.title };
});
console.log('\n=== PAGE STATE ===');
console.log('Title:', info.title);
console.log('URL:', info.url);
console.log('Root display:', info.rootStyle);
console.log('Body children:', info.bodyChildren);
console.log('Root HTML:', info.rootHTML.substring(0, 150));

await browser.close();
