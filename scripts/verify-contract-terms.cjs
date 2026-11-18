const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createSiteServer } = require('./serve-site.cjs');
const source = require('../data/contract-terms.json');
const out = process.env.TERMS_SCREENSHOTS || path.join(process.env.TEMP, 'recrutae-condicoes-preview');
const normalize = text => text.replace(/\s+/g, ' ').trim();

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const server = createSiteServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.SITE_URL || `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  try {
    const errors = [];
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route('**/*.supabase.co/**', route => route.fulfill({ status: 201, body: '' }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { window.print = () => { window.printInvoked = true; }; });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
      assert.equal((await page.goto(base + '/condicoes-gerais-de-contratacao')).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px`);
      const actual = await page.locator('[data-source-paragraph]').allTextContents();
      assert.deepEqual(actual.map(normalize), source.paragraphs.map(normalize));
      if (width !== 320) {
        const size = width === 1440 ? 'desktop' : 'celular';
        await page.locator('.terms-footer-brand img').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(out, `condicoes-${size}.png`) });
        await page.screenshot({ path: path.join(out, `condicoes-completa-${size}.png`), fullPage: true });
        await page.keyboard.press('Tab');
        await page.locator('.terms-home').focus();
        assert.equal(await page.locator('.terms-home').evaluate(element => getComputedStyle(element).outlineColor), 'rgb(31, 28, 75)');
        await page.screenshot({ path: path.join(process.env.TEMP, `recrutae-condicoes-foco-${size}.png`) });
      }
      if (width < 600) {
        assert.equal(await page.locator('#termsIndex').getAttribute('open'), null);
        await page.locator('#termsIndex summary').click();
      }
      await page.locator('.terms-index a[href="#secao-10"]').click();
      await page.waitForFunction(() => document.querySelector('.terms-index a[href="#secao-10"]').getAttribute('aria-current') === 'location');
      assert.ok(await page.locator('#secao-10').evaluate(el => el.getBoundingClientRect().top >= 76), 'Cabeçalho não cobre a seção');
      if (width === 1440) await page.screenshot({ path: path.join(out, 'condicoes-leitura.png') });
      assert.equal(await page.locator('#copyTermsLink').count(), 0);
      assert.equal(await page.locator('.terms-hero button, .terms-hero a').count(), 0);
      assert.ok(await page.locator('#downloadTerms').evaluate(element => !!element.closest('.terms-content') && !!(document.getElementById('secao-12').compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)));
      if (width !== 320) await page.locator('.terms-download').screenshot({ path: path.join(out, `download-${width === 1440 ? 'desktop' : 'celular'}.png`), style: '.terms-header {visibility:hidden!important}' });
      const download = page.waitForEvent('download');
      await page.locator('#downloadTerms').click();
      const received = await download;
      assert.match(received.suggestedFilename(), /Recrutae\.pdf$/);
      const receivedFile = await received.path();
      assert.equal(fs.readFileSync(receivedFile).subarray(0, 5).toString(), '%PDF-');
      await page.locator('#printTerms').click();
      assert.equal(await page.evaluate(() => window.printInvoked), true);
      await page.goto(base + '/');
      await page.locator('footer a[href="/condicoes-gerais-de-contratacao"]').scrollIntoViewIfNeeded();
      if (width !== 320) await page.locator('footer').screenshot({ path: path.join(out, `rodape-${width === 1440 ? 'desktop' : 'celular'}.png`), style: '#navbar {visibility:hidden!important}' });
      await page.locator('footer a[href="/condicoes-gerais-de-contratacao"]').click();
      await page.waitForURL('**/condicoes-gerais-de-contratacao');
      await page.locator('.terms-home').click();
      await page.waitForURL(base + '/');
    }
    const plain = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    const nojs = await plain.newPage();
    await nojs.goto(base + '/condicoes-gerais-de-contratacao');
    assert.deepEqual((await nojs.locator('[data-source-paragraph]').allTextContents()).map(normalize), source.paragraphs.map(normalize));
    assert.equal(await nojs.locator('#copyTermsLink').count(), 0);
    assert.equal(await nojs.locator('#downloadTerms').isVisible(), true);
    assert.equal(await nojs.locator('h1').isVisible(), true);
    await nojs.locator('.terms-home').click();
    await nojs.waitForURL(base + '/');
    await page.goto(base + '/condicoes-gerais-de-contratacao');
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.terms-sidebar').isVisible(), false);
    assert.equal(await page.locator('#secao-12').isVisible(), true);
    await page.pdf({ path: path.join(process.env.TEMP, 'recrutae-condicoes-print-qa.pdf'), format: 'A4', printBackground: true });
    assert.deepEqual(errors, []);
    console.log(`PASS: 67 source paragraphs, 12 sections, 3 viewport widths, footer and return navigation, section index, real PDF download at bottom, print styles, no-JS content, no runtime errors. Screenshots: ${out}`);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
