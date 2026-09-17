// Blocs Ékole — same-origin end-to-end test (playwright-core + Chrome for Testing, fake webcam).
// Classify4Kids v2 is served at / and the Blocs Ékole build at /blocs/ of the SAME origin:
//   1. NODE_ENV=production ROOT=/blocs/ npm run build
//   2. SITE=$(mktemp -d); git -C <classify4kids> archive qa/2026-09-16-c4k-v2 public | tar -x -C $SITE --strip-components=1
//      cp -R build $SITE/blocs; (cd $SITE && python3 -m http.server 8123 --bind 127.0.0.1)
//      (not port 8000: TurboWarp already trusts http://localhost:8000/ extensions for development)
//   3. FIX must contain fin-seance-09-et-10.sb3 (workshops kit) and mon-heros.sprite3 (make-sprite3.mjs)
//   4. PW=<playwright-core dir> CH=<chrome binary> BASE=http://localhost:8123 FIX=<dir> CAPS=docs/captures \
//      OUT=/tmp/result.json node test/ekole-e2e/e2e-blocs.mjs
// Needs the network for TF.js/MobileNet (cdn.jsdelivr.net, tfhub.dev, kaggle, storage.googleapis.com).
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = await import(process.env.PW + '/index.mjs');
const BASE = process.env.BASE || 'http://localhost:8123';
const FIX = process.env.FIX;
const CAPS = process.env.CAPS;
fs.mkdirSync(CAPS, { recursive: true });

const results = [];
const facts = {};
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch({
  executablePath: process.env.CH,
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
// English browser on purpose: Blocs Ékole must still open in French.
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 600 }, locale: 'en-US', permissions: ['camera'], acceptDownloads: true,
});

const consoleErrors = [];
const dialogs = [];
function watch(page, tag) {
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`[${tag}] pageerror ${e.message}`));
  page.on('dialog', (d) => { dialogs.push(`[${tag}] ${d.type()}: ${d.message()}`); d.accept(); });
}

// =========================================================== (a) Classify4Kids: train saute / rien
{
  const page = await ctx.newPage();
  watch(page, 'c4k');
  await page.goto(BASE + '/');
  await page.waitForFunction(() => /exemple/.test(document.getElementById('projCounts').textContent), null, { timeout: 30_000 });
  await page.fill('#newLabel', 'saute');
  await page.press('#newLabel', 'Enter');
  await page.fill('#newLabel', 'rien');
  await page.click('#addLabelForm button[type=submit]');
  await page.waitForFunction(() => document.querySelectorAll('.label').length === 2, null, { timeout: 5000 });
  check('C4K : étiquettes saute et rien', (await page.locator('.label-name').allInnerTexts()).join(',') === 'saute,rien');

  await page.click('[data-pick]:has-text("saute")');
  await page.click('#addCam .cam-on');
  await page.waitForFunction(() => document.getElementById('camTrain').videoWidth > 0, null, { timeout: 15_000 });
  await page.click('#btnBurst');
  await page.waitForFunction(() => /5 exemples/.test([...document.querySelectorAll('.label')].find((el) => el.textContent.includes('saute')).textContent), null, { timeout: 30_000 });
  await page.click('[data-pick]:has-text("rien")');
  await page.click('#btnBurst');
  await page.waitForFunction(() => /5 exemples/.test([...document.querySelectorAll('.label')].find((el) => el.textContent.includes('rien')).textContent), null, { timeout: 30_000 });
  check('C4K : 5 photos webcam par étiquette', /10 exemples/.test(await page.locator('#projCounts').innerText()), await page.locator('#projCounts').innerText());

  await page.click('#tabLearn');
  await page.waitForFunction(() => !/Chargement/.test(document.getElementById('learnStatus').textContent), null, { timeout: 180_000 });
  await page.click('#btnLearn');
  await page.waitForFunction(() => /Modèle à jour/.test(document.getElementById('learnStatus').textContent), null, { timeout: 180_000 });
  check('C4K : « 🧠 Apprendre » → modèle à jour', true, await page.locator('#learnStatus').innerText());

  const model = await page.evaluate(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open('c4k'); q.onsuccess = () => r(q.result); });
    const get = (s, k) => new Promise((r) => { const q = db.transaction(s).objectStore(s).get(k); q.onsuccess = () => r(q.result); });
    const active = await get('meta', 'activeProjectId');
    const m = await get('models', active.value);
    db.close();
    return { labels: m.labels, classes: Object.keys(m.dataset).length, n: m.exampleCount, format: m.format };
  });
  check('C4K : détecteur dans IndexedDB c4k', model.classes === 2 && model.labels.join(',') === 'saute,rien', JSON.stringify(model));
  await page.close();
}

// =========================================================== (b) Blocs Ékole at /blocs/
const page = await ctx.newPage();
watch(page, 'blocs');
const requests = [];
page.on('request', (r) => requests.push(r.url()));
// Chrome has the File System Access API: TurboWarp opens projects with showOpenFilePicker(),
// which Playwright cannot drive. Replace it by a stub that returns the file given by the test.
await page.addInitScript(() => {
  window.__ekoleNextFile = null;
  window.showOpenFilePicker = async () => [{
    kind: 'file',
    name: window.__ekoleNextFile.name,
    getFile: async () => window.__ekoleNextFile,
  }];
});
const t0 = Date.now();
await page.goto(BASE + '/blocs/');
await page.waitForFunction(() => window.vm && document.querySelectorAll('.scratchCategoryMenuItem').length > 5, null, { timeout: 60_000 });
await page.waitForFunction(() => window.vm.extensionManager.isExtensionLoaded('classify4kids'), null, { timeout: 30_000 })
  .catch(() => {});
facts.loadMs = Date.now() - t0;
await page.waitForTimeout(1500);

check('/blocs/ : titre « Blocs Ékole »', (await page.title()) === 'Blocs Ékole', await page.title());
const menuText = await page.locator('[class*="menu-bar_menu-bar_"]').first().innerText();
facts.menuBarText = menuText.replace(/\s+/g, ' ').trim();
check('/blocs/ : nom et « Code source » dans la barre de menus', menuText.includes('Blocs Ékole') && menuText.includes('Code source'), facts.menuBarText);
facts.sourceHref = await page.locator('a:has-text("Code source")').first().getAttribute('href');
check('/blocs/ : lien Code source', facts.sourceHref === 'https://github.com/EkoleIO/blocs-ekole', facts.sourceHref);
facts.locale = await page.evaluate(() => window.vm.runtime.getLocale ? window.vm.runtime.getLocale() : null);
const categories = await page.locator('.scratchCategoryMenuItemLabel').allInnerTexts();
facts.categories = categories;
check('/blocs/ : interface en français (navigateur en anglais)', menuText.includes('Fichier') && categories.includes('Mouvement'), categories.join(' | '));
check('/blocs/ : extension chargée sans sandbox', await page.evaluate(() => {
  const em = window.vm.extensionManager;
  const url = location.origin + '/scratch/extension.js';
  return em.isExtensionLoaded('classify4kids') && em.isExtensionURLLoaded(url) &&
    String(em._loadedExtensions.get('classify4kids')).startsWith('unsandboxed.');
}), await page.evaluate(() => String(window.vm.extensionManager._loadedExtensions.get('classify4kids'))));
const modalCount = await page.locator('.ReactModal__Content').count();
check('/blocs/ : aucune invite de sécurité', modalCount === 0 && dialogs.filter((d) => d.startsWith('[blocs]')).length === 0, `modales=${modalCount}`);
check('/blocs/ : catégorie de l’extension en bas de la liste', categories[categories.length - 1] === 'Classify4Kids', categories[categories.length - 1]);
facts.extensionBlocks = await page.evaluate(() => {
  const info = window.vm.runtime._blockInfo.find((c) => c.id === 'classify4kids');
  return { name: info.name, blocks: info.blocks.map((b) => b.info && b.info.text).filter(Boolean) };
});
console.log('extension blocks', JSON.stringify(facts.extensionBlocks));

// (d1) editor screenshot
await page.screenshot({ path: path.join(CAPS, '01-editeur-1280x600.png') });

// (d2) extension blocks in the palette
await page.locator('.scratchCategoryMenuItem', { hasText: 'Classify4Kids' }).click();
await page.waitForTimeout(1200);
const flyoutTexts = await page.evaluate(() => [...document.querySelectorAll('.blocklyFlyout .blocklyBlockCanvas > g')]
  .map((g) => [...g.querySelectorAll('.blocklyText')].map((t) => t.textContent).join(' ').replace(/\s+/g, ' ').trim())
  .filter(Boolean));
facts.flyoutClassify4Kids = flyoutTexts.filter((t) => /charger|reconna|classe|confiance|état|Classify4Kids/.test(t));
check('/blocs/ : blocs en français dans la palette', facts.flyoutClassify4Kids.some((t) => t.includes('classe reconnue')), facts.flyoutClassify4Kids.join(' | '));
await page.screenshot({ path: path.join(CAPS, '02-blocs-classify4kids.png'), clip: { x: 0, y: 0, width: 760, height: 600 } });

// (b) tiny project: the extension reads the detector trained in (a) from IndexedDB, then classifies the webcam.
// The project references the OLD C4K URL (turbowarp.org instructions): the already loaded extension must be used.
const handoff = await page.evaluate(async () => {
  const vm = window.vm;
  const project = JSON.parse(vm.toJSON());
  const stage = project.targets.find((t) => t.isStage);
  stage.variables.ekoleRes = ['resultat', ''];
  stage.variables.ekoleEtat = ['etat', ''];
  stage.variables.ekoleConf = ['confiance', ''];
  Object.assign(stage.blocks, {
    hat: { opcode: 'event_whenflagclicked', next: 'load', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 20, y: 20 },
    load: { opcode: 'classify4kids_loadProject', next: 'classify', parent: 'hat', inputs: { KEY: [1, [10, 'ABC234']] }, fields: {}, shadow: false, topLevel: false },
    classify: { opcode: 'classify4kids_classify', next: 'setRes', parent: 'load', inputs: {}, fields: {}, shadow: false, topLevel: false },
    setRes: { opcode: 'data_setvariableto', next: 'setEtat', parent: 'classify', inputs: { VALUE: [3, 'repRes', [10, '']] }, fields: { VARIABLE: ['resultat', 'ekoleRes'] }, shadow: false, topLevel: false },
    repRes: { opcode: 'classify4kids_result', next: null, parent: 'setRes', inputs: {}, fields: {}, shadow: false, topLevel: false },
    setEtat: { opcode: 'data_setvariableto', next: 'setConf', parent: 'setRes', inputs: { VALUE: [3, 'repEtat', [10, '']] }, fields: { VARIABLE: ['etat', 'ekoleEtat'] }, shadow: false, topLevel: false },
    repEtat: { opcode: 'classify4kids_status', next: null, parent: 'setEtat', inputs: {}, fields: {}, shadow: false, topLevel: false },
    setConf: { opcode: 'data_setvariableto', next: null, parent: 'setEtat', inputs: { VALUE: [3, 'repConf', [10, '']] }, fields: { VARIABLE: ['confiance', 'ekoleConf'] }, shadow: false, topLevel: false },
    repConf: { opcode: 'classify4kids_confidence', next: null, parent: 'setConf', inputs: {}, fields: {}, shadow: false, topLevel: false },
  });
  project.extensions = ['classify4kids'];
  project.extensionURLs = { classify4kids: 'https://classify4kids.netlify.app/scratch/extension.js' };
  await vm.loadProject(project);
  vm.greenFlag();
  const start = Date.now();
  const read = () => {
    const vars = vm.runtime.getTargetForStage().variables;
    return { resultat: vars.ekoleRes.value, etat: vars.ekoleEtat.value, confiance: vars.ekoleConf.value };
  };
  while (Date.now() - start < 150_000) {
    const v = read();
    if (v.etat !== '') return { ...v, ms: Date.now() - start };
    await new Promise((r) => setTimeout(r, 500));
  }
  return { ...read(), ms: Date.now() - start, timeout: true };
});
facts.handoff = handoff;
check('same-origin : « classe reconnue » = saute ou rien', ['saute', 'rien'].includes(handoff.resultat), JSON.stringify(handoff));
check('same-origin : modèle lu dans le navigateur (sans clé)', /prêt \(2 classes, navigateur\)/.test(handoff.etat), handoff.etat);
check('projet référençant l’ancienne URL : pas d’invite', (await page.locator('.ReactModal__Content').count()) === 0 && dialogs.filter((d) => d.startsWith('[blocs]')).length === 0);
// Same serializer as File > Save (saveProjectSb3 writes this project.json).
const saved = await page.evaluate(() => JSON.parse(window.vm.toJSON()).extensionURLs);
facts.savedExtensionURLs = saved;
check('projet réenregistré avec l’URL de la même origine', saved && saved.classify4kids === BASE + '/scratch/extension.js', JSON.stringify(saved));

// (c) File menu labels
await page.keyboard.press('Escape');
const fileMenu = page.locator('[class*="menu-bar_menu-bar-item"]', { hasText: 'Fichier' }).first();
await fileMenu.click();
await page.waitForTimeout(500);
facts.fileMenu = (await page.locator('[class*="menu-bar_menu-bar-menu"] [class*="menu_menu-item"]').allInnerTexts()).map((t) => t.trim());
check('Menu Fichier : libellés relevés', facts.fileMenu.length >= 3, facts.fileMenu.join(' | '));
await page.screenshot({ path: path.join(CAPS, '03-menu-fichier.png'), clip: { x: 0, y: 0, width: 640, height: 360 } });

// Load the kit project through « Importer depuis votre ordinateur » (picker stubbed, see above)
const sb3 = fs.readFileSync(path.join(FIX, 'fin-seance-09-et-10.sb3')).toString('base64');
await page.evaluate((b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  window.__ekoleNextFile = new File([bytes], 'fin-seance-09-et-10.sb3', { type: 'application/x.scratch.sb3' });
}, sb3);
await page.locator('[class*="menu_menu-item"]', { hasText: 'Importer depuis votre ordinateur' }).click();
await page.waitForFunction(() => window.vm.runtime.targets.some((t) => t.sprite && t.sprite.name === 'Hero'), null, { timeout: 30_000 });
facts.loadedSprites = await page.evaluate(() => window.vm.runtime.targets.filter((t) => t.isOriginal && !t.isStage).map((t) => t.sprite.name));
facts.projectTitle = await page.locator('[class*="project-title-input"] input, input[class*="title-field"]').first().inputValue().catch(() => null);
check('Fichier → Importer : kit fin-seance-09-et-10.sb3 chargé', facts.loadedSprites.includes('Hero'), `${facts.loadedSprites.join(', ')} ; titre=${facts.projectTitle}`);

// Sprite import « Importer un sprite » with the .sprite3 made by ekole-sprite
const spriteButton = page.locator('[class*="sprite-selector_add-button"] [class*="action-menu_button"]').first();
await spriteButton.hover();
await page.waitForTimeout(600);
facts.spriteMenu = await page.locator('[class*="sprite-selector_add-button"] [aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
const importSprite = page.locator('[class*="sprite-selector_add-button"] [aria-label="Importer un sprite"]').first();
if (await importSprite.count()) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10_000 }), importSprite.click()]);
  await chooser.setFiles(path.join(FIX, 'mon-heros.sprite3'));
  await page.waitForFunction(() => window.vm.runtime.targets.some((t) => t.sprite && t.sprite.name === 'Héros'), null, { timeout: 20_000 });
  facts.importedSprite = await page.evaluate(() => {
    const t = window.vm.runtime.targets.find((x) => x.sprite && x.sprite.name === 'Héros');
    return { name: t.sprite.name, costumes: t.sprite.costumes.map((c) => c.name) };
  });
}
check('« Importer un sprite » : mon-heros.sprite3 (ekole-sprite)', facts.importedSprite && facts.importedSprite.costumes.join(',') === 'course1,course2,saut', JSON.stringify({ menu: facts.spriteMenu, sprite: facts.importedSprite }));

// Language menu kept
await page.locator('[class*="menu-bar_menu-bar-item"]', { hasText: 'Paramètres' }).first().click().catch(() => {});
await page.waitForTimeout(400);
facts.settingsMenu = (await page.locator('[class*="menu-bar_menu-bar-menu"] [class*="menu_menu-item"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
check('Menu Paramètres : langue toujours disponible', facts.settingsMenu.some((t) => /Langue/.test(t)), facts.settingsMenu.join(' | '));
await page.keyboard.press('Escape');

// About page
const about = await ctx.newPage();
watch(about, 'about');
await about.goto(BASE + '/blocs/credits.html');
await about.waitForSelector('h1');
const aboutText = await about.locator('main').innerText();
check('À propos : mention et lien Code source', aboutText.includes('Non affilié à la Scratch Foundation') && (await about.locator('a:has-text("Code source")').getAttribute('href')) === 'https://github.com/EkoleIO/blocs-ekole', aboutText.slice(0, 160).replace(/\s+/g, ' '));
await about.close();

facts.externalHosts = [...new Set(requests.map((u) => new URL(u).host))].filter((h) => !h.startsWith('localhost'));
facts.consoleErrors = consoleErrors;
facts.dialogs = dialogs;
fs.writeFileSync(process.env.OUT, JSON.stringify({ results, facts }, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} PASS`);
await browser.close();
