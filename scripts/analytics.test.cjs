const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAnalytics } = require('../analytics.js');

test('atribuição de campanha persiste entre páginas sem capturar email nem query livre', async () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const events = [];
  const fetch = async (url, options) => { events.push(JSON.parse(options.body)); return { ok: true }; };
  const first = createAnalytics({ endpoint: 'https://events.example', key: 'public-key', storage, location: new URL('https://www.recrutae.com.br/?utm_source=google&utm_medium=cpc&utm_campaign=recrutamento&email=privado@example.com'), referrer: 'https://www.google.com/search?q=privado', fetch });
  await first.track('page_view');
  const next = createAnalytics({ endpoint: 'https://events.example', key: 'public-key', storage, location: new URL('https://www.recrutae.com.br/blog-post?post=custo-cadeira-vazia'), referrer: 'https://www.recrutae.com.br/', fetch });
  await next.contact('company', 'contactForm');
  assert.equal(events[1].event_type, 'generate_lead');
  assert.equal(events[1].meta.attribution.source, 'google');
  assert.equal(events[1].meta.attribution.campaign, 'recrutamento');
  assert.equal(events[1].page, '/blog-post?post=custo-cadeira-vazia');
  assert.ok(!JSON.stringify(events).includes('privado'));
  assert.equal(events[0].session_id, events[1].session_id);
});

test('candidato é separado de lead comercial e storage/fetch indisponíveis não quebram a página', async () => {
  const events = [];
  const tracker = createAnalytics({ endpoint: 'https://events.example', key: 'public-key', location: new URL('https://www.recrutae.com.br/sou-candidato'), storage: { getItem() { throw Error(); } }, fetch: async (url, options) => { events.push(JSON.parse(options.body)); return { ok: true }; } });
  await tracker.contact('candidate', 'contactFormCandidato');
  assert.equal(events[0].event_type, 'candidate_contact');
  assert.equal(events[0].meta.contact_kind, 'candidate');
  const offline = createAnalytics({ endpoint: 'https://events.example', key: 'public-key', location: new URL('https://www.recrutae.com.br/'), fetch: async () => { throw Error('offline'); } });
  assert.equal(await offline.track('page_view'), false);
});
