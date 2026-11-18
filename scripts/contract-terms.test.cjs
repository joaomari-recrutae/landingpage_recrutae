const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const source = require('../data/contract-terms.json');
const root = path.resolve(__dirname, '..');
const route = '/condicoes-gerais-de-contratacao';
const normalize = text => text.replace(/\s+/g, ' ').trim();

test('condições preservam todos os parágrafos, números e ordem do documento do advogado', () => {
  const $ = cheerio.load(fs.readFileSync(path.join(root, route + '.html'), 'utf8'));
  const actual = $('[data-source-paragraph]').map((_, element) => normalize($(element).text())).get();
  assert.deepEqual(actual, source.paragraphs.map(normalize));
  assert.equal($('.terms-content section').length, 12);
  assert.equal($('.terms-content section h2').length, 12, 'subcláusulas 4.3–4.7 não são novas seções');
  assert.equal($('link[rel=canonical]').attr('href'), 'https://www.recrutae.com.br' + route);
  assert.equal($('#copyTermsLink, #termsShareUrl, #termsShareStatus').length, 0);
  assert.equal($('.terms-hero button, .terms-hero a').length, 0);
  assert.equal($('#downloadTerms').closest('.terms-download').length, 1);
  const pdf = $('#downloadTerms').attr('href');
  assert.equal(fs.readFileSync(path.join(root, pdf)).subarray(0, 5).toString(), '%PDF-');
});

test('índice aponta para as doze seções e o rodapé das páginas públicas dá acesso às condições', () => {
  const $ = cheerio.load(fs.readFileSync(path.join(root, route + '.html'), 'utf8'));
  const links = $('.terms-index a');
  assert.equal(links.length, 12);
  links.each((_, element) => assert.equal($($(element).attr('href')).length, 1));
  for (const directory of ['.', 'templates']) {
    const names = fs.readdirSync(path.join(root, directory)).filter(name => name.endsWith('.html') && !name.startsWith('painel-') && name !== '404.html');
    for (const name of names) {
      const page = cheerio.load(fs.readFileSync(path.join(root, directory, name), 'utf8'));
      assert.equal(page(`footer a[href="${route}"]`).length, 1, name);
    }
  }
});
