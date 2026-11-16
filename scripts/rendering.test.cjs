const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const serveTemplate = require('../lib/seo-template.cjs');

async function render(page, parameter, query, loadPost = async () => null) {
  const server = http.createServer((req, res) => Promise.resolve(serveTemplate(req, res, page, parameter, page === 'blog-post' ? 'engenharia-da-escolha' : '', { loadPost })).catch(error => { res.statusCode = 500; res.end(error.message); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/${page}${query}`);
    return { status: response.status, html: await response.text() };
  } finally { await new Promise(resolve => server.close(resolve)); }
}

test('artigo estático chega com título e corpo correspondentes sem JavaScript', async () => {
  const result = await render('blog-post', 'post', '?post=custo-cadeira-vazia');
  assert.equal(result.status, 200);
  assert.match(result.html, /<title>O Custo Invisível da Cadeira Vazia \| Recrutaê Blog<\/title>/);
  assert.match(result.html, /<h1[^>]*>O Custo Invisível da Cadeira Vazia<\/h1>/);
  assert.ok(result.html.includes('Perda de Oportunidade:'), 'O corpo deve pertencer ao artigo solicitado');
});

test('indústria e posição chegam completas no HTML, sem placeholders de carregamento', async () => {
  for (const [page, param, slug, text] of [
    ['industria-template', 'ind', 'tecnologia', 'Tecnologia'],
    ['posicao-template', 'pos', 'bancos-financeiros', 'Bancos'],
  ]) {
    const result = await render(page, param, `?${param}=${slug}`);
    assert.equal(result.status, 200);
    assert.ok(!result.html.includes('Carregando...'));
    assert.match(result.html, new RegExp(`<title>[^<]*${text}`));
    assert.ok(!result.html.includes(`id="${param}-roles"></div>`));
  }
});

test('post publicado no CMS é renderizado e HTML perigoso é removido', async () => {
  const result = await render('blog-post', 'post', '?post=publicado-no-cms', async () => ({
    slug: 'publicado-no-cms', title: 'Título do CMS', excerpt: 'Descrição do artigo', tag: 'Gestão',
    content_html: '<p>Conteúdo publicado</p><script>alert(1)</script><a href="javascript:alert(1)">link</a><img src="/assets/logos/favicon-square.png" onerror="alert(1)">',
    published_at: '2026-11-10T12:00:00Z', author_name: 'Equipe Recrutaê', read_time: '4 min de leitura',
  }));
  assert.equal(result.status, 200);
  assert.match(result.html, /<h1[^>]*>Título do CMS<\/h1>/);
  assert.match(result.html, /Conteúdo publicado/);
  assert.ok(!result.html.includes('javascript:alert'));
  assert.ok(!result.html.includes('onerror='));
  assert.ok(!result.html.includes('<script>alert(1)</script>'));
});

test('identificadores inexistentes e malformados retornam HTTP 404', async () => {
  for (const query of ['?post=nao-existe', '?post=constructor', '?post=%22%3E%3Cscript%3E']) {
    const result = await render('blog-post', 'post', query);
    assert.equal(result.status, 404);
  }
  assert.equal((await render('industria-template', 'ind', '?ind=nao-existe')).status, 404);
  assert.equal((await render('posicao-template', 'pos', '?pos=nao-existe')).status, 404);
});
