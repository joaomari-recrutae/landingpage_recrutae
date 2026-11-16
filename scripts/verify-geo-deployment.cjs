/* Usage: node scripts/verify-geo-deployment.cjs https://www.recrutae.com.br
   Protected preview: add --preview (uses the authenticated Vercel CLI). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const base = (process.argv[2] || 'https://www.recrutae.com.br').replace(/\/$/, '');
const headers = {};
if (process.argv.includes('--preview')) {
  const vercel = path.join(process.env.APPDATA, 'npm/node_modules/vercel/dist/index.js');
  const raw = execFileSync(process.execPath, [vercel, 'api', '/v9/projects/prj_zp4KT2CNDnBbRiOexJWiHMxgCf47', '--scope', 'recrutae', '--raw'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const project = JSON.parse(raw);
  const secret = Object.keys(project.protectionBypass || {})[0];
  assert.ok(secret, 'Authenticated preview access must be available');
  headers['x-vercel-protection-bypass'] = secret;
}
const request = url => fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(20000) });
const canonical = html => html.match(/<link rel="canonical" href="([^"]+)"/)[1].replaceAll('&amp;', '&');

(async () => {
  for (const name of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
    const response = await request(`${base}/${name}`);
    assert.equal(response.status, 200, name);
    // Git on Windows can use CRLF while Vercel's Linux checkout uses LF.
    const published = (await response.text()).replaceAll('\r\n', '\n');
    const supplied = fs.readFileSync(path.resolve(__dirname, '..', name), 'utf8').replaceAll('\r\n', '\n');
    assert.equal(published, supplied, `${name}: published content`);
  }
  const urls = [...fs.readFileSync(path.resolve(__dirname, '../sitemap.xml'), 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  let checked = 0;
  async function worker() {
    while (urls.length) {
      const expected = urls.shift();
      const url = new URL(expected);
      const response = await request(base + url.pathname + url.search);
      assert.equal(response.status, 200, expected);
      if (!process.argv.includes('--preview')) assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag') || ''), expected);
      const html = await response.text();
      assert.equal(canonical(html), expected, expected);
      const data = html.match(/<script type="application\/ld\+json" id="recrutae-structured-data">([\s\S]*?)<\/script>/);
      assert.ok(data, `Structured data missing: ${expected}`);
      const schema = JSON.parse(data[1]);
      assert.ok(schema['@graph'].some(item => item['@type'] === 'WebPage' && item.url === expected));
      if (url.search) {
        assert.ok(!/<h1[^>]*>\s*Carregando/i.test(html), `Content must be rendered on the server: ${expected}`);
        if (url.searchParams.has('post')) assert.ok(schema['@graph'].some(item => item['@type'] === 'Article' && item.headline), expected);
      }
      const socialUrls = [...html.matchAll(/<meta property="(?:og:url|twitter:url)" content="([^"]+)"/g)];
      assert.ok(socialUrls.length > 0, `Social URL missing: ${expected}`);
      for (const [, value] of socialUrls) assert.equal(value.replaceAll('&amp;', '&'), expected, `Social URL: ${expected}`);
      for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
        const target = new URL(href.replaceAll('&amp;', '&'), expected);
        if (target.origin === url.origin) assert.ok(!target.pathname.endsWith('.html'), `${expected}: ${href}`);
      }
      checked++;
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  for (const [legacy, expected] of [
    ['/blog.html', '/blog'],
    ['/blog-post.html?post=custo-cadeira-vazia', '/blog-post?post=custo-cadeira-vazia'],
    ['/industria-template.html?ind=games', '/industria-template?ind=games'],
    ['/posicao-template.html?pos=vendas', '/posicao-template?pos=vendas'],
    ['/templates/blog-post?post=custo-cadeira-vazia', '/blog-post?post=custo-cadeira-vazia'],
  ]) {
    const response = await request(base + legacy);
    assert.equal(response.status, 308, legacy);
    assert.equal(response.headers.get('location'), expected, legacy);
  }
  const admin = await request(`${base}/admin-login`);
  assert.equal(admin.status, 200, 'Existing admin alias');
  for (const route of ['/nao-encontrado', '/uma/pasta/profunda/nao-encontrada', '/industria-template?ind=nao-existe', '/posicao-template?pos=nao-existe']) {
    const response = await request(base + route);
    assert.equal(response.status, 404, route);
    assert.ok((await response.text()).includes('Essa página faltou à entrevista.'), route);
  }
  for (const route of ['/fonts.css', '/analytics.js', '/assets/fonts/bricolage-grotesque-latin.woff2', '/assets/fonts/dm-sans-latin.woff2']) assert.equal((await request(base + route)).status, 200, route);
  console.log(`PASS ${base}: three exact files, ${checked} sitemap URLs return 200 without redirects and with matching canonical/social URLs, clean internal links, five legacy redirects preserve queries, admin alias responds.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
