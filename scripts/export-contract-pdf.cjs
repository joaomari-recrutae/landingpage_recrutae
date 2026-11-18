/* Regenerate the downloadable PDF after any approved change to the legal source. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createSiteServer } = require('./serve-site.cjs');

(async () => {
  const server = createSiteServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.route('**/*.supabase.co/**', route => route.fulfill({ status: 201, body: '' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/condicoes-gerais-de-contratacao`);
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].filter(image => image.getBoundingClientRect().height > 0).every(image => image.complete && image.naturalWidth > 0));
    const target = path.resolve(__dirname, '../assets/documentos/condicoes-gerais-de-contratacao.pdf');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await page.pdf({
      path: target, format: 'A4', printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;padding:0 18mm;text-align:right;font:9px Arial,sans-serif;color:#514b67">Recrutaê · Condições Gerais de Contratação &nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    console.log('PDF gerado: ' + target);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
