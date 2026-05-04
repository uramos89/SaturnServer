import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

await page.goto('http://192.168.174.134:3000', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(5000);

const info = await page.evaluate(() => {
  // Get the full inner HTML of the root
  const root = document.getElementById('root');
  const html = root ? root.innerHTML : 'NO ROOT';
  
  // Find all text elements
  const allText = document.body.innerText;
  
  return {
    allText: allText.substring(0, 500),
    htmlSnippet: html.substring(0, 1000),
    rootClass: root ? root.className : 'none',
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
});

console.log('=== TEXT ON SCREEN ===');
console.log(info.allText);
console.log('\n=== HTML SNIPPET ===');
console.log(info.htmlSnippet);
console.log('\n=== BG COLOR ===', info.bodyBg);

await browser.close();
