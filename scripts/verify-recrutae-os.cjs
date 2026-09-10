/* Run with Playwright installed, or PLAYWRIGHT_MODULE pointing to its module. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Shared site analytics are unrelated to this local demonstration.
    await page.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    const response = await page.goto(`${base}/recrutae-os.html`);
    assert.equal(response.status(), 200, 'Product page must exist');
    await page.getByRole('tab', { name: 'Gestão de candidatos' }).click();
    assert.equal(await page.getByRole('tab', { name: 'Gestão de candidatos' }).getAttribute('aria-selected'), 'true');
    await page.getByLabel('Etapa de Camila R.').selectOption('Entrevista');
    assert.equal(await page.locator('[data-stage="Entrevista"] [data-candidate="camila"]').count(), 1);
    assert.equal(await page.locator('[data-stage="Inscrito"] [data-count]').innerText(), '1');
    assert.equal(await page.locator('[data-stage="Entrevista"] [data-count]').innerText(), '2');
    await page.getByRole('button', { name: 'Reiniciar demonstração' }).click();
    assert.equal(await page.locator('[data-stage="Inscrito"] [data-candidate="camila"]').count(), 1);
    await page.getByRole('tab', { name: 'Página de carreiras' }).click();
    await page.getByRole('button', { name: 'Usar identidade azul' }).click();
    assert.equal(await page.getByRole('button', { name: 'Usar identidade azul' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('tab', { name: 'Página de carreiras' }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Gestão de candidatos' }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.getByRole('tab', { name: 'Entrevistas e IA' }).getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#demo-entrevistas').isVisible(), true);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of ['Página de carreiras', 'Gestão de candidatos', 'Entrevistas e IA']) {
        await page.getByRole('tab', { name }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No page overflow at ${width}px: ${name}`);
      }
    }
    await page.getByRole('tab', { name: 'Página de carreiras' }).click();
    await page.getByRole('link', { name: 'Ver exemplo do relatório' }).click();
    assert.equal(await page.locator('#demo-entrevistas').isVisible(), true);
    await page.waitForFunction(() => {
      const top = document.getElementById('demo-entrevistas').getBoundingClientRect().top;
      return top >= 70 && top < 160;
    });
    const panelTop = await page.locator('#demo-entrevistas').evaluate(el => el.getBoundingClientRect().top);
    assert.ok(panelTop >= 70 && panelTop < 160, 'Deep link opens and scrolls to the visible panel');
    const broken = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => a.hash.length > 1 && !document.getElementById(a.hash.slice(1))).map(a => a.hash));
    assert.deepEqual(broken, []);
    const local = await page.evaluate(() => [...document.querySelectorAll('img[src],script[src],link[rel="stylesheet"]')].map(el => el.src || el.href).filter(url => new URL(url).origin === location.origin));
    for (const url of new Set(local)) assert.equal((await page.request.get(url)).status(), 200, url);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
    assert.deepEqual(errors, []);
    const plain = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await plain.newPage();
    await fallback.goto(`${base}/recrutae-os.html`);
    for (const id of ['demo-carreiras','demo-candidatos','demo-entrevistas']) assert.equal(await fallback.locator(`#${id}`).isVisible(), true, 'All content without JavaScript');
    await plain.close();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/index.html`);
    await page.locator('#navMenu').getByRole('link', { name: 'Recrutaê OS', exact: true }).click();
    await page.waitForURL('**/recrutae-os.html');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/index.html`);
    await page.locator('#hamburger').click();
    await page.locator('#mobileOverlay').getByRole('link', { name: 'Recrutaê OS', exact: true }).click();
    await page.waitForURL('**/recrutae-os.html');
    assert.deepEqual(errors, []);
    console.log('PASS: tabs/keyboard/deep links, branding, candidate movement/reset/counts, 5 widths x 3 panels, local assets/anchors, reduced motion, no-JS, desktop/mobile homepage navigation, zero runtime errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
