const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { pageSchema, serialize } = require('../lib/structured-data.cjs');

test('Organization identifica a empresa com os dados institucionais públicos', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const match = html.match(/<script type="application\/ld\+json" id="recrutae-structured-data">([\s\S]*?)<\/script>/);
  assert.ok(match, 'A página inicial precisa publicar o JSON-LD');
  const schema = JSON.parse(match[1]);
  const org = schema['@graph'].find(item => item['@type'] === 'Organization');
  assert.equal(org.name, 'Recrutaê');
  assert.equal(org.taxID, '46.886.680/0001-93');
  assert.equal(org.url, 'https://www.recrutae.com.br/');
});

test('Article preserva data real, identidade e breadcrumb; conteúdo não fecha script', () => {
  const schema = pageSchema({ url: 'https://www.recrutae.com.br/blog-post?post=custo-cadeira-vazia', title: 'Artigo', description: 'Texto', article: { title: 'Título </script><script>alert(1)</script>', author: 'Equipe Recrutaê', date: '15 de Maio de 2026' } });
  const serialized = serialize(schema);
  assert.ok(!serialized.includes('</script>'));
  const parsed = JSON.parse(serialized);
  const article = parsed['@graph'].find(item => item['@type'] === 'Article');
  assert.equal(article.datePublished, '2026-05-15');
  assert.equal(article.publisher['@id'], 'https://www.recrutae.com.br/#organization');
  const trail = parsed['@graph'].find(item => item['@type'] === 'BreadcrumbList');
  assert.deepEqual(trail.itemListElement.map(item => item.name), ['Início', 'Blog', 'Título </script><script>alert(1)</script>']);
});
