const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createSiteServer } = require('./serve-site.cjs');

(async () => {
  const server = createSiteServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const events = [];
    let contactSuccess = false;
    let searchMode = 'error';
    await page.route('**/*.supabase.co/**', async route => {
      const url = route.request().url();
      if (url.includes('/analytics_events')) { events.push(route.request().postDataJSON()); return route.fulfill({ status: 201, body: '' }); }
      if (url.includes('/submit-contact')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: contactSuccess, id: 'test-only' }) });
      if (url.includes('/process-search')) {
        if (searchMode === 'pending') return;
        return route.fulfill({ status: searchMode === 'error' ? 500 : 200, contentType: 'application/json', body: searchMode === 'error' ? '{}' : JSON.stringify({ success: true, candidateCount: 0, candidateCountSource: searchMode === 'estimate' ? 'estimate' : 'database', jobTitle: 'Analista de Dados' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.goto(`${base}/?utm_source=google&utm_campaign=tech`);
    const form = page.locator('#contactForm');
    await form.locator('[name=nome]').fill('Maria Souza');
    await form.locator('[name=email]').fill('qa-privado@example.com');
    await form.locator('[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#contactForm [type=submit]').disabled);
    assert.equal(events.filter(event => event.event_type === 'generate_lead').length, 0, 'HTTP 200 sem confirmação não gera conversão');
    contactSuccess = true;
    const converted = page.waitForResponse(response => response.url().includes('/analytics_events') && response.request().postDataJSON().event_type === 'generate_lead');
    await form.locator('[type=submit]').click();
    await page.waitForFunction(() => document.querySelector('#formSuccess').textContent.includes('Solicitação recebida'));
    await converted;
    assert.equal(events.filter(event => event.event_type === 'generate_lead').length, 1);
    assert.ok(!JSON.stringify(events).includes('qa-privado'));
    assert.equal(events.find(event => event.event_type === 'generate_lead').meta.attribution.source, 'google');

    await page.goto(`${base}/busca-candidatos`);
    await page.locator('#startWizardBtn').click();
    for (const [id, value] of Object.entries({ cName: 'Maria Souza', cRole: 'Gestora de RH', cCompany: 'Empresa de teste', cEmail: 'qa-privado@example.com', cPhone: '11999999999' })) await page.locator('#' + id).fill(value);
    await page.locator('#nextContact').click();
    for (let i = 1; i <= 7; i++) {
      const step = page.locator(`#step-q${i}`);
      if (i === 1) await step.locator('[data-mode=text]').click();
      await step.locator('textarea').fill('Buscamos um analista de dados com experiência em SQL e colaboração com equipes de negócios.');
      await step.locator('.btn-wiz-next').click();
    }
    await page.waitForSelector('#step-error.active', { timeout: 6000 });
    assert.equal(await page.locator('#step-results').isVisible(), false, 'Falha não pode apresentar 72 candidatos inventados');
    searchMode = 'zero';
    await page.locator('#retrySearch').click();
    await page.waitForSelector('#step-results.active');
    await page.waitForFunction(() => document.getElementById('resCount').textContent === '0');
    assert.equal(await page.locator('.res-count-row').isVisible(), true);
    searchMode = 'estimate';
    await page.locator('#wizClose').click();
    await page.locator('#startWizardBtn').click();
    await page.locator('#nextContact').click();
    for (let i = 1; i <= 7; i++) await page.locator(`#step-q${i} .btn-wiz-next`).click();
    await page.waitForSelector('#step-results.active');
    assert.equal(await page.locator('.res-count-row').isVisible(), false, 'Estimativa não pode aparecer como contagem real');
    assert.equal((await page.locator('.res-pre').textContent()).trim(), 'Briefing recebido');
    searchMode = 'pending';
    await page.locator('#wizClose').click();
    await page.locator('#startWizardBtn').click();
    await page.locator('#nextContact').click();
    for (let i = 1; i <= 7; i++) await page.locator(`#step-q${i} .btn-wiz-next`).click();
    await page.waitForSelector('#step-processing.active');
    await page.locator('#wizClose').click();
    assert.equal(await page.locator('#wizardOverlay').evaluate(el => el.classList.contains('active')), false);
    console.log('PASS: confirmed conversions only, campaign attribution, no contact fields in analytics, honest wizard error/retry, zero preserved, cancellation remains available.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
