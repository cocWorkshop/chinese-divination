import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Login first
  await page.goto('http://localhost:8088/login');
  await page.fill('input[type="email"]', 'test@test.com');
  await page.fill('input[type="password"]', 'Test1234!');
  await page.click('button:has-text("登入"), button:has-text("Sign In")');
  await page.waitForTimeout(1500);

  // Measure and screenshot /divination
  await page.goto('http://localhost:8088/divination');
  await page.waitForTimeout(800);
  const fabDiv = await page.$('button[aria-label*="Master"], button[aria-label*="大師"]');
  const boxDiv = await fabDiv?.boundingBox();
  const metricsDiv = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollbarWidth: window.innerWidth - document.documentElement.clientWidth,
  }));
  console.log('/divination:', { box: boxDiv, metrics: metricsDiv, distFromWindowRight: 1440 - ((boxDiv?.x || 0) + (boxDiv?.width || 0)) });
  await page.screenshot({ path: 'scratch/fab_divination.png' });

  // Measure and screenshot / (home page)
  await page.goto('http://localhost:8088/');
  await page.waitForTimeout(800);
  const fabHome = await page.$('button[aria-label*="Master"], button[aria-label*="大師"]');
  const boxHome = await fabHome?.boundingBox();
  const metricsHome = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollbarWidth: window.innerWidth - document.documentElement.clientWidth,
  }));
  console.log('/ (home):', { box: boxHome, metrics: metricsHome, distFromWindowRight: 1440 - ((boxHome?.x || 0) + (boxHome?.width || 0)) });
  await page.screenshot({ path: 'scratch/fab_home.png' });

  // Measure and screenshot /divination/bazi
  await page.goto('http://localhost:8088/divination/bazi');
  await page.waitForTimeout(800);
  const fabBazi = await page.$('button[aria-label*="Master"], button[aria-label*="大師"]');
  const boxBazi = await fabBazi?.boundingBox();
  const metricsBazi = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollbarWidth: window.innerWidth - document.documentElement.clientWidth,
  }));
  console.log('/divination/bazi:', { box: boxBazi, metrics: metricsBazi, distFromWindowRight: 1440 - ((boxBazi?.x || 0) + (boxBazi?.width || 0)) });
  await page.screenshot({ path: 'scratch/fab_bazi.png' });

  await browser.close();
}

capture().catch(console.error);
