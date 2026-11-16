const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createSiteServer } = require('./serve-site.cjs');
const server = createSiteServer();
let base;
before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

const canonical = html => html.match(/<link rel="canonical" href="([^"]+)"/)[1];
const publicFiles = [
  ...fs.readdirSync(path.resolve(__dirname, '..')),
  ...fs.readdirSync(path.resolve(__dirname, '../templates')),
].filter(file => file.endsWith('.html') && !file.startsWith('painel-'));

test('os arquivos fornecidos respondem na raiz pública e o sitemap lista URLs canônicas únicas', async () => {
  for (const name of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
    const response = await fetch(`${base}/${name}`);
    assert.equal(response.status, 200, name);
    const text = await response.text();
    if (name === 'robots.txt') assert.match(text, /Sitemap: https:\/\/www\.recrutae\.com\.br\/sitemap\.xml/);
    if (name === 'sitemap.xml') {
      const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
      assert.equal(urls.length, 44);
      assert.equal(new Set(urls).size, 44);
      for (const url of urls) {
        assert.equal(new URL(url).origin, 'https://www.recrutae.com.br');
        assert.ok(!url.includes('.html'), url);
      }
    }
  }
});

test('páginas públicas entregam canonicals limpos no www e links internos sem .html', async () => {
  for (const file of publicFiles) {
    const pathname = file === 'index.html' ? '/' : `/${file.slice(0, -5)}`;
    const response = await fetch(base + pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    const expected = pathname === '/blog-post' ? 'https://www.recrutae.com.br/blog-post?post=engenharia-da-escolha' : `https://www.recrutae.com.br${pathname}`;
    assert.equal(canonical(html), expected, file);
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      const url = new URL(href.replaceAll('&amp;', '&'), `https://www.recrutae.com.br${pathname}`);
      if (url.hostname.endsWith('recrutae.com.br')) assert.ok(!url.pathname.endsWith('.html'), `${file}: ${href}`);
    }
  }
});

for (const [route, expected] of [
  ['/blog-post?post=custo-cadeira-vazia&utm_source=teste', 'https://www.recrutae.com.br/blog-post?post=custo-cadeira-vazia'],
  ['/blog-post?post=ia-no-recrutamento', 'https://www.recrutae.com.br/blog-post?post=ia-no-recrutamento'],
  ['/industria-template?ind=tecnologia&utm_campaign=teste', 'https://www.recrutae.com.br/industria-template?ind=tecnologia'],
  ['/industria-template?ind=games', 'https://www.recrutae.com.br/industria-template?ind=games'],
  ['/posicao-template?pos=bancos-financeiros', 'https://www.recrutae.com.br/posicao-template?pos=bancos-financeiros'],
  ['/posicao-template?pos=recursos-humanos', 'https://www.recrutae.com.br/posicao-template?pos=recursos-humanos'],
  ['/blog-post?post=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E', 'https://www.recrutae.com.br/blog-post?post=%22%3E%3Cscript%3Ealert%281%29%3C%2Fscript%3E'],
]) {
  test(`canonical e URLs sociais já estão corretos no HTML sem JavaScript: ${route}`, async () => {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal(canonical(html), expected);
    for (const property of ['og:url', 'twitter:url']) {
      assert.equal(html.match(new RegExp(`<meta property="${property}" content="([^"]+)"`))[1], expected);
    }
    assert.equal([...html.matchAll(/<link rel="canonical"/g)].length, 1);
    assert.ok(!html.includes('<script>alert(1)</script>'));
  });
}
