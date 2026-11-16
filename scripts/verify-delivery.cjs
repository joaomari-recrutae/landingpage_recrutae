const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
const screenshots = process.env.QA_SCREENSHOTS || path.join(process.env.TEMP, 'recrutae-landing-qa');

(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const events = [];
    const published = Array.from({ length: 9 }, (_, index) => ({ slug: `conteudo-${index}`, title: `Conteúdo ${index}`, excerpt: 'Texto de verificação do blog.', tag: 'Gestão', published_at: '2026-11-10T12:00:00Z' }));
    await page.route('**/*.supabase.co/**', route => {
      if (route.request().url().includes('/analytics_events')) { events.push(route.request().postDataJSON()); return route.fulfill({ status: 201, body: '' }); }
      const body = route.request().url().includes('/blog_posts?') ? JSON.stringify(published) : '[]';
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/', '/blog', '/blog-post?post=custo-cadeira-vazia', '/industria-template?ind=tecnologia', '/posicao-template?pos=vendas', '/uma/pasta/pagina-ausente']) {
        const response = await page.goto(base + route);
        assert.equal(response.status(), route.includes('pagina-ausente') ? 404 : 200, route);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} overflows at ${width}`);
        assert.equal(await page.locator('h1').isVisible(), true, route);
        if (!process.env.SKIP_SCREENSHOTS && route.includes('pagina-ausente') && width !== 320) await page.screenshot({ path: path.join(screenshots, `404-${width}.png`), fullPage: true });
        if (!process.env.SKIP_SCREENSHOTS && route === '/' && width !== 320) {
          await page.screenshot({ path: path.join(screenshots, `home-${width}.png`) });
          await page.locator('.commercial-faq').screenshot({ path: path.join(screenshots, `faq-${width}.png`) });
          await page.locator('.metrics').screenshot({ path: path.join(screenshots, `delivery-${width}.png`) });
          await page.locator('.commercial-faq summary').first().click();
          assert.equal(await page.locator('.commercial-faq details').first().getAttribute('open'), '');
        }
      }
    }
    await page.goto(base + '/blog');
    await page.waitForFunction(() => document.querySelectorAll('.blog-post-row').length === 9);
    assert.equal(await page.locator('.blog-post-row:visible').count(), 5);
    await page.locator('#verMaisBtn').click();
    assert.equal(await page.locator('.blog-post-row:visible').count(), 9);
    await page.locator('#blogSearchInput').fill('conteudo 8');
    assert.equal(await page.locator('.blog-post-row:visible').count(), 1);
    await page.locator('#blogSearchInput').fill('zzzzzzz');
    assert.equal(await page.locator('#noResultsMessage').isVisible(), true);
    await page.locator('#blogSearchInput').fill('');
    assert.equal(await page.locator('.blog-post-row:visible').count(), 9);
    await page.goto(base + '/recrutae-os?utm_source=google&utm_campaign=produto');
    await page.waitForFunction(() => !!window.recrutaeAnalytics);
    await page.goto(base + '/');
    const last = events.filter(event => event.event_type === 'page_view').at(-1);
    assert.equal(last.meta.attribution.campaign, 'produto');
    await page.evaluate(() => { document.getElementById('page-overlay').classList.add('active'); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
    assert.equal(await page.locator('#page-overlay').evaluate(el => el.classList.contains('active')), false);
    assert.deepEqual(errors, []);
    const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await plain.route('**/*.woff2', route => route.abort());
    const fallback = await plain.newPage();
    for (const route of ['/', '/blog-post?post=custo-cadeira-vazia', '/industria-template?ind=tecnologia', '/posicao-template?pos=vendas', '/uma/pasta/pagina-ausente']) {
      await fallback.goto(base + route);
      assert.equal(await fallback.locator('h1').isVisible(), true);
      const hidden = await fallback.locator('.animate-up, .hero-anim').evaluateAll(elements => elements.filter(element => getComputedStyle(element).opacity === '0').length);
      assert.equal(hidden, 0, `Content hidden without scripts/fonts: ${route}`);
    }
    await fallback.getByRole('link', { name: 'Voltar à página inicial' }).click();
    assert.equal(new URL(fallback.url()).pathname, '/');
    await plain.close();
    console.log('PASS: 6 routes x 3 widths, blog refresh/search/pagination, OS campaign attribution, overlay restore, no runtime errors, content and 404 recovery without JavaScript or webfonts. Screenshots: ' + screenshots);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
