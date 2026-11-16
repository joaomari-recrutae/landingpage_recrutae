const { readFileSync } = require('node:fs');
const path = require('node:path');

const origin = 'https://www.recrutae.com.br';

// Set these tags in the HTTP response so crawlers do not need JavaScript.
module.exports = function serveTemplate(req, res, page, parameter, fallback = '') {
  const requestUrl = new URL(req.url, origin);
  const value = requestUrl.searchParams.get(parameter) || fallback;
  const canonical = new URL(`/${page}`, origin);
  if (value) canonical.searchParams.set(parameter, value);
  const attribute = canonical.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const html = readFileSync(path.join(process.cwd(), 'templates', `${page}.html`), 'utf8')
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_, start, end) => start + attribute + end)
    .replace(/(<meta property="(?:og:url|twitter:url)" content=")[^"]*(")/g, (_, start, end) => start + attribute + end);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.statusCode = 200;
  res.end(html);
};
