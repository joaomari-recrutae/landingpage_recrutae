const assert = require('node:assert/strict');
const fs = require('node:fs');
const posts = require('../blog-data.js');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Exercise the existing static fallback without depending on CMS availability.
    await page.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    const titles = { post: new Set(), ind: new Set(), pos: new Set() };
    const urls = [...fs.readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]));
    for (const url of urls) {
      const response = await page.goto(base + url.pathname + url.search);
      assert.equal(response.status(), 200, url.href);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), url.href);
      if (url.searchParams.has('post')) {
        assert.equal(await page.title(), `${posts[url.searchParams.get('post')].title} | Recrutaê Blog`);
      }
      const heading = (await page.locator('h1').innerText()).trim();
      assert.ok(heading && !/não encontrad/i.test(heading), url.href);
      for (const key of Object.keys(titles)) {
        if (url.searchParams.has(key)) titles[key].add(heading);
      }
    }
    assert.equal(titles.post.size, 8, 'All eight fallback articles render distinct content');
    assert.equal(titles.ind.size, 14, 'All fourteen industries render distinct content');
    assert.equal(titles.pos.size, 14, 'All fourteen positions render distinct content');
    assert.deepEqual(errors, []);
    const plain = await browser.newContext({ javaScriptEnabled: false });
    const raw = await plain.newPage();
    for (const route of ['/blog-post?post=custo-cadeira-vazia', '/industria-template?ind=tecnologia', '/posicao-template?pos=vendas']) {
      await raw.goto(base + route);
      assert.equal(await raw.locator('link[rel="canonical"]').getAttribute('href'), 'https://www.recrutae.com.br' + route);
    }
    await plain.close();
    console.log('PASS: all 45 sitemap pages render; 8 articles, 14 industries and 14 positions have distinct content; canonical metadata works with and without JavaScript; zero runtime errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
