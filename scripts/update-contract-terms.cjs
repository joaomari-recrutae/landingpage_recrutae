/* Regenerate the public document from the lawyer's verbatim source paragraphs. */
const fs = require('node:fs');
const path = require('node:path');
const { pageSchema, serialize } = require('../lib/structured-data.cjs');
const source = require('../data/contract-terms.json');
const root = path.resolve(__dirname, '..');
const route = '/condicoes-gerais-de-contratacao';
const url = 'https://www.recrutae.com.br' + route;
const escape = text => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const [title, effective, company, ...rest] = source.paragraphs;
const sections = [];
rest.forEach((text, offset) => {
  if (/^\d+\.\s/.test(text)) sections.push({ number: text.split('.')[0], title: text, sourceIndex: offset + 3, paragraphs: [] });
  else sections.at(-1).paragraphs.push({ text, sourceIndex: offset + 3 });
});
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const description = 'Consulte as Condições Gerais de Contratação dos serviços de recrutamento e seleção da Recrutaê, com vigência a partir de novembro de 2026.';
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)} | Recrutaê</title>
  <meta name="description" content="${escape(description)}">
  <meta name="theme-color" content="#1F1C4B">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${escape(title)} | Recrutaê">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:image" content="https://www.recrutae.com.br/assets/logos/Recrutae%20horizontal%202026.png">
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${url}">
  <meta property="twitter:title" content="${escape(title)} | Recrutaê">
  <meta property="twitter:description" content="${escape(description)}">
  <meta property="twitter:image" content="https://www.recrutae.com.br/assets/logos/Recrutae%20horizontal%202026.png">
  <link rel="preload" href="/assets/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/dm-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/fonts.css">
  <link rel="stylesheet" href="/style.css?v=13">
  <link rel="stylesheet" href="/contratacao.css?v=2">
  <link rel="icon" href="/assets/logos/favicon-square.png" type="image/png">
  <script src="/contratacao.js?v=2" defer></script>
  <script src="/analytics.js?v=1" defer></script>
  <script type="application/ld+json" id="recrutae-structured-data">${serialize(pageSchema({ url, title: title + ' | Recrutaê', description }))}</script>
</head>
<body class="terms-page">
  <a class="terms-skip" href="#conteudo">Pular para as condições</a>
  <header class="terms-header">
    <nav class="container terms-nav" aria-label="Navegação principal">
      <a class="terms-brand" href="/" aria-label="Recrutaê — página inicial"><img src="/assets/logos/Principal_Recrutae%20horizontal%202026.png" alt="Recrutaê" width="158" height="40"></a>
      <a class="terms-home" href="/">Voltar ao site ${arrow}</a>
    </nav>
    <div class="terms-progress" aria-hidden="true"><span id="termsProgress"></span></div>
  </header>
  <main id="conteudo" tabindex="-1">
    <section class="terms-hero" aria-labelledby="termsTitle">
      <div class="container terms-hero-inner">
        <div class="terms-entry">
          <h1 id="termsTitle" data-source-paragraph="0">${escape(title).replace(' de ', ' <br>de <span>')}</span></h1>
          <p class="terms-intro">Consulte as condições dos serviços de recrutamento e seleção da Recrutaê.</p>
          <p class="terms-effective" data-source-paragraph="1">${escape(effective)}</p>
        </div>
      </div>
    </section>
    <div class="container terms-layout">
      <aside class="terms-sidebar">
        <details class="terms-index" id="termsIndex" open>
          <summary>Índice do documento <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
          <nav aria-label="Seções das condições gerais">
            <h2>Neste documento</h2>
            <ol>${sections.map(section => `<li><a href="#secao-${section.number}"><span class="terms-index-number" aria-hidden="true">${section.number.padStart(2, '0')}</span><span>${escape(section.title.replace(/^\d+\.\s/, ''))}</span></a></li>`).join('')}</ol>
          </nav>
        </details>
      </aside>
      <article class="terms-content" aria-label="Texto integral das condições gerais de contratação">
        <p class="terms-company" data-source-paragraph="2">${escape(company)}</p>
${sections.map(section => `        <section id="secao-${section.number}" aria-labelledby="titulo-secao-${section.number}">
          <h2 id="titulo-secao-${section.number}" data-source-paragraph="${section.sourceIndex}">${escape(section.title)}</h2>
${section.paragraphs.map(paragraph => `          <p${/^\d+\.\d+\./.test(paragraph.text) ? ` id="clausula-${paragraph.text.match(/^(\d+)\.(\d+)\./).slice(1).join('-')}"` : ''} data-source-paragraph="${paragraph.sourceIndex}">${escape(paragraph.text)}</p>`).join('\n')}
        </section>`).join('\n')}
        <div class="terms-download" aria-labelledby="termsDownloadTitle">
          <div><h2 id="termsDownloadTitle">Uma cópia para consultar.</h2><p>Baixe estas condições em PDF.</p></div>
          <div class="terms-download-actions">
            <a class="terms-button" id="downloadTerms" href="/assets/documentos/condicoes-gerais-de-contratacao.pdf" download="Condicoes-Gerais-de-Contratacao-Recrutae.pdf"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>Baixar PDF</a>
            <button class="terms-print" id="printTerms" type="button" hidden>Imprimir documento</button>
          </div>
        </div>
        <nav class="terms-end" aria-label="Continuar no site"><a href="/">Voltar à página inicial ${arrow}</a><a href="#termsTitle">Início do documento ${arrow}</a></nav>
      </article>
    </div>
  </main>
  <footer class="footer terms-footer">
    <div class="container">
      <a class="terms-footer-brand" href="/" aria-label="Recrutaê — página inicial"><img src="/assets/logos/Recrutae%20horizontal%202026.png" alt="Recrutaê" width="140" height="36" loading="lazy"></a>
      <div class="footer-bottom">
        <a class="footer-privacy-link" href="/recrutae-os">Recrutaê OS</a>
        <a class="footer-privacy-link" href="/politica-de-privacidade">Política de Privacidade</a>
        <a class="footer-privacy-link" href="${route}" aria-current="page">Condições Gerais de Contratação</a>
        <p>© 2026 Recrutaê. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
</body>
</html>
`;
fs.writeFileSync(path.join(root, route + '.html'), html);
console.log(`Condições geradas: ${source.paragraphs.length} parágrafos originais, ${sections.length} seções.`);
