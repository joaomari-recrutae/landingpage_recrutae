const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
(async () => {
  // Enable animated scrolling explicitly in headless Chromium for this check.
  const browser = await chromium.launch({ headless: true, args: ['--enable-smooth-scrolling'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    const files = fs.readdirSync('.').filter(name => name.endsWith('.html') && !name.startsWith('painel-'));
    for (const file of files) {
      await page.goto(`${base}/${file}`);
      assert.equal(await page.evaluate(() => typeof window.recrutaeScrollToSection), 'function', file);
      const target = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a[href^="#"]')];
        return links.map(a => document.getElementById(a.hash.slice(1))).find(el => el && !el.hidden && el.getBoundingClientRect().top > 600)?.id;
      });
      if (target) {
        await page.evaluate(id => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          document.querySelector(`a[href="#${id}"]`).click();
        }, target);
        await page.waitForFunction(id => {
          const top = document.getElementById(id).getBoundingClientRect().top;
          return (top >= 0 && top < 180) || (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 2);
        }, target);
        assert.equal(new URL(page.url()).hash, `#${target}`, file);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth', file);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${base}/recrutae-os.html`);
    assert.notEqual(await page.locator('.ros-button').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(100);
    const initial = await page.evaluate(() => {
      document.querySelector('.ros-desktop-nav a[href="#planos"]').click();
      return scrollY;
    });
    await page.waitForTimeout(100);
    const intermediate = await page.evaluate(() => scrollY);
    await page.waitForFunction(() => Math.abs(document.getElementById('planos').getBoundingClientRect().top - 104) < 3);
    const final = await page.evaluate(() => scrollY);
    assert.ok(intermediate > initial && intermediate < final, `Scroll animates over time: ${initial}, ${intermediate}, ${final}`);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/recrutae-os.html`);
      const back = page.getByRole('link', { name: 'Voltar à Recrutaê' });
      assert.ok(await back.isVisible());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width === 1440 || width === 390) await page.screenshot({ path: `${process.env.TEMP}/ros-header-${width}.png` });
      await back.click();
      await page.waitForURL('**/index.html');
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/alocacao.html`);
    await page.locator('.btn-cta-nav').click();
    await page.waitForURL('**/index.html#contato');
    await page.waitForFunction(() => {
      const top = document.getElementById('contato').getBoundingClientRect().top;
      return top >= 70 && top < 160;
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/index.html`);
    assert.notEqual(await page.locator('.hero-blob-gold').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.notEqual(await page.locator('.nav-link-os').evaluate(el => getComputedStyle(el, '::before').transitionDuration), '0s');
    const reveal = page.locator('.animate-up:not(.in-view)').first();
    await reveal.evaluate(el => { el.dataset.scrollCheck = 'true'; });
    const revealTarget = page.locator('[data-scroll-check]');
    await page.waitForTimeout(1700);
    assert.equal(await revealTarget.evaluate(el => el.classList.contains('in-view')), false, 'Offscreen entrance waits for scrolling, even after page startup');
    await revealTarget.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 180, behavior: 'instant' }));
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-scroll-check]');
      const opacity = Number(getComputedStyle(el).opacity);
      return el.classList.contains('in-view') && opacity > 0 && opacity < 1;
    });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-scroll-check]')).opacity === '1');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.locator('#hamburger').click();
    await page.locator('#mobileOverlay a[href="#contato"]').click();
    await page.waitForFunction(() => !document.getElementById('mobileOverlay').classList.contains('active') && scrollY > 500);
    console.log(`PASS: shared navigation on ${files.length} public pages, animated scrolling, reduced motion, return link at 4 widths, cross-page section link, mobile menu.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
