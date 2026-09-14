import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  for (const path of ['/', '/divination', '/divination/bazi', '/subscribe', '/login', '/history']) {
    await page.goto('http://localhost:8088' + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const fab = await page.$('button[aria-label*="玄機大師"], button[aria-label*="Master"]');
    if (!fab) {
      console.log(path, 'FAB NOT FOUND');
      continue;
    }
    const box = await fab.boundingBox();
    const metrics = await page.evaluate(() => ({
      windowInnerWidth: window.innerWidth,
      documentClientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      hasVerticalScrollbar: window.innerWidth > document.documentElement.clientWidth,
      scrollbarWidth: window.innerWidth - document.documentElement.clientWidth,
    }));
    console.log(path, { 
      box: { x: Math.round(box?.x || 0), y: Math.round(box?.y || 0), w: Math.round(box?.width || 0), h: Math.round(box?.height || 0) }, 
      metrics, 
      rightEdgeDist: 1440 - ((box?.x || 0) + (box?.width || 0)) 
    });
  }
  await browser.close();
}

check().catch(console.error);
