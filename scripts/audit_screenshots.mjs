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
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const url = 'http://localhost:8088/r/test-share-token-cmtzwkn66';

  console.log('Navigating to ZiWei reading page in Dark mode at', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Dark Mode full screenshot
  await page.screenshot({ path: path.join(outDir, 'dark_mode_full.png'), fullPage: false });
  console.log('Saved dark_mode_full.png');

  // Dark Mode scrolled
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'dark_mode_scrolled.png'), fullPage: false });
  console.log('Saved dark_mode_scrolled.png');

  // 2. Switch to Light Mode
  console.log('Switching to Light Mode...');
  // Click theme toggle button if available
  const toggleBtn = await page.$('button[title*="Light"], button[title*="Dark"]');
  if (toggleBtn) {
    await toggleBtn.click();
    console.log('Clicked theme toggle button!');
  } else {
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    });
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);

  // Light Mode top screenshot
  await page.screenshot({ path: path.join(outDir, 'light_mode_full.png'), fullPage: false });
  console.log('Saved light_mode_full.png');

  // Light Mode scrolled screenshot
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'light_mode_scrolled.png'), fullPage: false });
  console.log('Saved light_mode_scrolled.png');

  // Light Mode scrolled further down to key advice / chat
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'light_mode_bottom.png'), fullPage: false });
  console.log('Saved light_mode_bottom.png');

  console.log('Visual audit capture complete!');
  await browser.close();
}

run().catch(err => {
  console.error('Audit script error:', err);
  process.exit(1);
});
