import { chromium } from 'playwright';
import path from 'path';

const outDir = 'C:/Users/DaZWe/.gemini/antigravity-ide/brain/03cac1ec-b3bf-4600-9d90-6ae677059f96';

async function captureSelectedLiuNian() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:8088/r/bazi-v2-token', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Scroll down so the 10 LiuNian cards grid is clearly in the center
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(500);

  // Find 2017 card and click it
  const card = page.locator('button:has-text("2017")').first();
  if (await card.isVisible()) {
    await card.click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: path.join(outDir, 'verify_liunian_card_selected_centered.png') });
  console.log('Saved verify_liunian_card_selected_centered.png');
  await browser.close();
}

captureSelectedLiuNian().catch(console.error);
