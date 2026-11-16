const { readFileSync } = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const sanitize = require('../.generated/sanitize.cjs');
const posts = require('../blog-data.js');
const industries = require('../data/industries.json');
const positions = require('../data/positions.json');
const aliases = require('../data/position-aliases.json');
const store = require('./content-store.cjs');
const { pageSchema, serialize } = require('./structured-data.cjs');
const origin = 'https://www.recrutae.com.br';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeHtml = html => sanitize(html || '', {
  allowedTags: ['p','h2','h3','h4','strong','em','u','s','ul','ol','li','a','br','blockquote','img','span','div'],
  allowedAttributes: { a: ['href','target','rel'], img: ['src','alt','width','height','loading'] },
  allowedSchemes: ['https','http','mailto','tel'],
  transformTags: { a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer' }) },
});

function notFound(res) {
  let html;
  try { html = readFileSync(path.join(process.cwd(), '404.html'), 'utf8'); }
  catch { html = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Página não encontrada | Recrutaê</title><h1>Não encontramos esta página.</h1><a href="/">Voltar à Recrutaê</a></html>'; }
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(html);
}

module.exports = async function serveTemplate(req, res, page, parameter, fallback = '', dependencies = {}) {
  const requestUrl = new URL(req.url, origin);
  const value = requestUrl.searchParams.get(parameter) || fallback;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 160) return notFound(res);
  const $ = cheerio.load(readFileSync(path.join(process.cwd(), 'templates', `${page}.html`), 'utf8'));
  const canonical = new URL(`/${page}`, origin);
  canonical.searchParams.set(parameter, value);
  let title, description, article;

  if (page === 'blog-post') {
    let published, unavailable = false;
    try { published = await (dependencies.loadPost || store.loadPost)(value); }
    catch { unavailable = true; }
    const backup = Object.hasOwn(posts, value) ? posts[value] : null;
    if (!published && !backup) {
      if (!unavailable) return notFound(res);
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Retry-After', '60');
      res.setHeader('Cache-Control', 'no-store');
      return res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/style.css"><title>Conteúdo temporariamente indisponível | Recrutaê</title><main class="container" style="padding-block:6rem"><h1>Este conteúdo está fazendo uma pausa.</h1><p>Não conseguimos carregar o artigo agora. Tente novamente em instantes.</p><p><a class="btn btn-gold" href="/blog">Voltar ao blog</a></p></main></html>');
    }
    article = published ? {
      title: published.title, description: published.excerpt || published.title,
      content: published.content_html, image: published.cover_image, tag: published.tag || 'Blog',
      author: published.author_name || 'Equipe Recrutaê', date: published.published_at,
      modified: published.updated_at || published.published_at, readTime: published.read_time || '5 min de leitura',
    } : { ...backup, description: cheerio.load(backup.content)('p').first().text().slice(0, 170), author: 'Equipe Recrutaê' };
    title = `${article.title} | Recrutaê Blog`;
    description = article.description;
    $('.page-hero-title').text(article.title);
    $('.article-body').html(safeHtml(article.content));
    $('.breadcrumb span:last-child, .badge.badge-gold').text(article.tag);
    $('.article-tags').html(`<span class="chip">${escape(article.tag)}</span>`);
    const date = /^\d{4}-\d{2}-\d{2}/.test(article.date || '') ? new Date(article.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }) : article.date;
    $('.article-meta').text(`${date || ''} · ${article.readTime} · ${article.author}`);
    if (article.image && /^(?:https:\/\/|\/?assets\/)/.test(article.image)) {
      const image = /^\/?assets\//.test(article.image) ? '/' + article.image.replace(/^\//, '') : article.image;
      $('.article-hero-img').attr('style', '').html($('<img>').attr({ src: image, alt: article.title, width: 1200, height: 630, fetchpriority: 'high' }));
      $('meta[property="og:image"], meta[property="twitter:image"]').attr('content', new URL(article.image, origin).href);
    }
    $(`a.blog-card[href="/blog-post?post=${value}"]`).remove();
  } else if (page === 'industria-template') {
    const data = Object.hasOwn(industries, value) ? industries[value] : null;
    if (!data) return notFound(res);
    title = `Recrutamento para ${data.name} | Recrutaê`;
    description = data.sub;
    $('#ind-title').text(data.hero);
    $('#ind-sub').text(data.sub);
    $('#ind-breadcrumb').text(data.name);
    $('#ind-challenges').html(data.challenges.map(text => `<div class="diff-item"><div class="diff-content"><p class="diff-body">${escape(text)}</p></div></div>`).join(''));
    $('#ind-positions').html(data.positions.map(text => `<span class="chip">${escape(text)}</span>`).join(''));
  } else {
    const key = Object.hasOwn(aliases, value) ? aliases[value] : value;
    const data = Object.hasOwn(positions, key) ? positions[key] : null;
    if (!data) return notFound(res);
    title = `Recrutamento em ${data.name} | Recrutaê`;
    description = data.sub;
    $('#pos-title, #pos-breadcrumb').text(data.name);
    $('#pos-sub').text(data.sub);
    $('#pos-profile').text(data.profile);
    $('#pos-roles').html(data.roles.map(text => `<span class="chip">${escape(text)}</span>`).join(''));
  }
  $('title').text(title);
  $('meta[name="description"], meta[property="og:description"], meta[property="twitter:description"]').attr('content', description);
  $('meta[property="og:title"], meta[property="twitter:title"]').attr('content', title);
  $('link[rel="canonical"]').attr('href', canonical.href);
  $('meta[property="og:url"], meta[property="twitter:url"]').attr('content', canonical.href);
  $('body').attr('data-rendered', 'server');
  $('#recrutae-structured-data').remove();
  $('head').append(`<script type="application/ld+json" id="recrutae-structured-data">${serialize(pageSchema({ url: canonical.href, title, description, article }))}</script>`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.statusCode = 200;
  res.end($.html());
};
module.exports.notFound = notFound;
