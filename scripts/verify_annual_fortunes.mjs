import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const outDir = 'C:\\Users\\DaZWe\\.gemini\\antigravity-ide\\brain\\03cac1ec-b3bf-4600-9d90-6ae677059f96';

async function run() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1300 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('1. Testing BaZi DaYun sections at /r/bazi-v2-token...');
  await page.goto('http://localhost:8088/r/bazi-v2-token', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Scroll to 大运精批
  const dayunHeading = await page.$('text=大運精批');
  if (dayunHeading) {
    await dayunHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
  }

  // Find year buttons inside the decade cards
  const yearButtons = await page.$$('details button');
  console.log(`Found ${yearButtons.length} interactive buttons inside BaZi decade cards.`);
  
  for (const btn of yearButtons) {
    const text = await btn.innerText();
    if (/\d{4}/.test(text)) {
      console.log('Clicking BaZi year button:', text.replace(/\n/g, ' '));
      await btn.click();
      await page.waitForTimeout(1000);
      break;
    }
  }

  await page.screenshot({ path: path.join(outDir, 'bazi_dayun_decade_dark.png'), fullPage: false });
  console.log('Saved bazi_dayun_decade_dark.png');

  // Switch to Light Mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'bazi_dayun_decade_light.png'), fullPage: false });
  console.log('Saved bazi_dayun_decade_light.png');

  console.log('2. Testing ZiWei Decade sections at /r/ziwei-v2-token...');
  // Switch back to Dark mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });

  await page.goto('http://localhost:8088/r/ziwei-v2-token', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  const ziweiDayunHeading = await page.$('text=大限精批');
  if (ziweiDayunHeading) {
    await ziweiDayunHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
  }

  const ziweiButtons = await page.$$('details button');
  console.log(`Found ${ziweiButtons.length} interactive buttons inside Ziwei decade cards.`);

  for (const btn of ziweiButtons) {
    const text = await btn.innerText();
    if (/\d{4}/.test(text)) {
      console.log('Clicking Ziwei year button:', text.replace(/\n/g, ' '));
      await btn.click();
      await page.waitForTimeout(1000);
      break;
    }
  }

  await page.screenshot({ path: path.join(outDir, 'ziwei_dayun_decade_dark.png'), fullPage: false });
  console.log('Saved ziwei_dayun_decade_dark.png');

  // Switch to Light Mode for Ziwei
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'ziwei_dayun_decade_light.png'), fullPage: false });
  console.log('Saved ziwei_dayun_decade_light.png');

  console.log('All annual fortune visual verifications complete!');
  await browser.close();
}

run().catch(err => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
