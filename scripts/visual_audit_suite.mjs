import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const outDir = 'C:\\Users\\DaZWe\\.gemini\\antigravity-ide\\brain\\03cac1ec-b3bf-4600-9d90-6ae677059f96\\visual_audit';

const ROUTES = [
  { name: '01_landing_home', path: '/' },
  { name: '02_divination_hub', path: '/divination' },
  { name: '03_form_bazi', path: '/divination/bazi' },
  { name: '04_form_ziwei', path: '/divination/ziwei' },
  { name: '05_form_iching', path: '/divination/iching' },
  { name: '06_form_liuyao', path: '/divination/liuyao' },
  { name: '07_form_qimen', path: '/divination/qimen' },
  { name: '08_form_meihua', path: '/divination/meihua' },
  { name: '09_form_fengshui', path: '/divination/fengshui' },
  { name: '10_reading_bazi', path: '/r/bazi-v2-token' },
  { name: '11_reading_ziwei', path: '/r/ziwei-v2-token' },
  { name: '12_funnel_start', path: '/start' },
  { name: '13_auth_login', path: '/login' },
  { name: '14_auth_register', path: '/register' },
  { name: '15_subscribe_karma', path: '/subscribe' },
  { name: '16_wiki_index', path: '/wiki' },
  { name: '17_legal_privacy', path: '/privacy' },
];

async function run() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Launching Chromium for Full Visual Audit...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const report = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.warn(`[Page Console Error] ${msg.text()}`);
    }
  });

  for (const route of ROUTES) {
    const url = `http://localhost:8088${route.path}`;
    console.log(`\n========================================`);
    console.log(`Auditing: ${route.name} (${url})`);
    console.log(`========================================`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(1000);

      // --- 1. DARK MODE CHECK ---
      await page.evaluate(() => {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Diagnostic: Check for horizontal overflow
      const darkOverflow = await page.evaluate(() => {
        const body = document.body;
        const doc = document.documentElement;
        return {
          bodyScrollWidth: body.scrollWidth,
          bodyClientWidth: body.clientWidth,
          docScrollWidth: doc.scrollWidth,
          docClientWidth: doc.clientWidth,
          hasOverflow: doc.scrollWidth > doc.clientWidth,
        };
      });

      const darkImgPath = path.join(outDir, `${route.name}_dark.png`);
      await page.screenshot({ path: darkImgPath, fullPage: false });
      console.log(`  ✓ Saved Dark: ${route.name}_dark.png (Overflow: ${darkOverflow.hasOverflow})`);

      // If it's a reading result, also scroll to check DaYun/DaXian
      if (route.name.startsWith('10_reading_') || route.name.startsWith('11_reading_')) {
        await page.evaluate(() => window.scrollBy(0, 750));
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(outDir, `${route.name}_dark_dayun.png`), fullPage: false });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
      }

      // --- 2. LIGHT MODE CHECK ---
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('theme', 'light');
      });
      await page.waitForTimeout(800);

      const lightOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          hasOverflow: doc.scrollWidth > doc.clientWidth,
        };
      });

      const lightImgPath = path.join(outDir, `${route.name}_light.png`);
      await page.screenshot({ path: lightImgPath, fullPage: false });
      console.log(`  ✓ Saved Light: ${route.name}_light.png (Overflow: ${lightOverflow.hasOverflow})`);

      if (route.name.startsWith('10_reading_') || route.name.startsWith('11_reading_')) {
        await page.evaluate(() => window.scrollBy(0, 750));
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(outDir, `${route.name}_light_dayun.png`), fullPage: false });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
      }

      report.push({
        route: route.path,
        name: route.name,
        darkOverflow: darkOverflow.hasOverflow,
        lightOverflow: lightOverflow.hasOverflow,
        status: 'OK',
      });
    } catch (err) {
      console.error(`  ✗ Error auditing ${route.name}:`, err.message);
      report.push({
        route: route.path,
        name: route.name,
        error: err.message,
        status: 'FAILED',
      });
    }
  }

  console.log('\n========================================');
  console.log('AUDIT SUMMARY:');
  console.log(JSON.stringify(report, null, 2));
  console.log('========================================\n');

  await browser.close();
}

run().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
