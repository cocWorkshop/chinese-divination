import { chromium } from 'playwright';
import path from 'path';

const outDir = 'C:\\Users\\DaZWe\\.gemini\\antigravity-ide\\brain\\03cac1ec-b3bf-4600-9d90-6ae677059f96';

async function verifyAll() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('1. Logging in as test@test.com...');
  await page.goto('http://localhost:8088/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'test@test.com');
  await page.fill('input[type="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForTimeout(800);

  // 1. Verify LiuNian decade cards top border when selected
  console.log('2. Navigating to /r/bazi-v2-token ...');
  await page.goto('http://localhost:8088/r/bazi-v2-token', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Scroll to LiuNian section
  await page.evaluate(() => window.scrollBy(0, 850));
  await page.waitForTimeout(500);

  // Click on the first of the 10 LiuNian year cards (e.g. 2017)
  console.log('3. Clicking LiuNian year card to select it...');
  const yearCard = page.locator('button:has-text("2017")').first();
  if (await yearCard.isVisible()) {
    await yearCard.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(outDir, 'verify_liunian_card_selected.png') });

  // 2. Trigger FullPageFlameEffect
  console.log('4. Triggering FullPageFlameEffect...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('xuanji:triggerFlame'));
  });
  await page.waitForTimeout(400); // capture flame burst + seal
  await page.screenshot({ path: path.join(outDir, 'verify_flame_effect_burst.png') });

  await page.waitForTimeout(1000); // capture rising embers
  await page.screenshot({ path: path.join(outDir, 'verify_flame_effect_embers.png') });

  console.log('Done!');
  await browser.close();
}

verifyAll().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
