const fs = require('node:fs');
const cheerio = require('cheerio');
const { pageSchema, serialize } = require('../lib/structured-data.cjs');
for (const file of fs.readdirSync('.').filter(name => name.endsWith('.html') && !name.startsWith('painel-') && name !== '404.html')) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html);
  const url = $('link[rel="canonical"]').attr('href');
  if (!url) continue;
  const schema = pageSchema({ url, title: $('title').text(), description: $('meta[name="description"]').attr('content') });
  const script = `<script type="application/ld+json" id="recrutae-structured-data">${serialize(schema)}</script>`;
  const cleaned = html.replace(/\s*<script type="application\/ld\+json" id="recrutae-structured-data">[\s\S]*?<\/script>/, '');
  fs.writeFileSync(file, cleaned.replace('</head>', `  ${script}\n</head>`));
}
console.log('Dados estruturados atualizados nas páginas estáticas.');
