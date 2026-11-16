const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { createSiteServer } = require('./serve-site.cjs');
const cheerio = require('cheerio');
const server = createSiteServer();
let base;
before(async () => { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => new Promise(resolve => server.close(resolve)));

test('caminhos profundos e identificadores inválidos mostram a 404 da marca com status real', async () => {
  for (const pathname of ['/pagina-que-nao-existe', '/uma/pasta/profunda/que-nao-existe', '/industria-template?ind=nao-existe', '/posicao-template?pos=nao-existe']) {
    const response = await fetch(base + pathname);
    assert.equal(response.status, 404);
    const $ = cheerio.load(await response.text());
    assert.equal($('h1').text(), 'Essa página faltou à entrevista.');
    assert.match($('meta[name="robots"]').attr('content'), /noindex/);
    assert.equal($('script').length, 0, 'Recuperação não deve depender de JavaScript');
    for (const element of $('a[href], link[href], img[src]')) {
      const url = $(element).attr('href') || $(element).attr('src');
      assert.ok(url.startsWith('/'), `Recurso deve funcionar em qualquer profundidade: ${url}`);
      assert.equal((await fetch(base + url)).status, 200, url);
    }
  }
});
