// Generates mon-heros.sprite3 with the Ékole sprite app (Apps/panel/ekole-sprite, robot preset), like a child would.
//   PW=... CH=... APP=/path/ekole-sprite/public/index.html OUT=/dir node make-sprite3.mjs
import path from 'node:path';

const { chromium } = await import(process.env.PW + '/index.mjs');
const browser = await chromium.launch({ executablePath: process.env.CH, headless: true });
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.setDefaultTimeout(10000);
await page.goto('file://' + process.env.APP);
// The help dialog opens on the first visit.
await page.waitForTimeout(500);
if (await page.locator('#aide[open]').count()) await page.keyboard.press('Escape');
await page.click('#bRobot');
// A confirmation only appears when the drawing is not empty.
if (await page.locator('#dlg[open]').count()) await page.click('#dlgOui');
const [download] = await Promise.all([page.waitForEvent('download'), page.click('#bSprite3')]);
const target = path.join(process.env.OUT, download.suggestedFilename());
await download.saveAs(target);
console.log('saved', target);
await browser.close();
