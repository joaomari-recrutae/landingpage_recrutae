const organization = require('../data/organization.json');
const origin = 'https://www.recrutae.com.br';
const serialize = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const breadcrumb = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, item], index) => ({ '@type': 'ListItem', position: index + 1, name, item })) });

function dateISO(value) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parts = value.toLowerCase().match(/(\d{1,2}) de (\S+) de (\d{4})/);
  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const month = parts && months.indexOf(parts[2]);
  return parts && month >= 0 ? `${parts[3]}-${String(month + 1).padStart(2, '0')}-${parts[1].padStart(2, '0')}` : undefined;
}

function pageSchema({ url, title, description, article }) {
  const home = url === origin + '/';
  const graph = [];
  if (home) graph.push(organization, { '@type': 'WebSite', '@id': origin + '/#website', url: origin + '/', name: 'Recrutaê', publisher: { '@id': organization['@id'] }, inLanguage: 'pt-BR' });
  graph.push({ '@type': 'WebPage', '@id': url + '#webpage', url, name: title, description, inLanguage: 'pt-BR', isPartOf: { '@id': origin + '/#website' }, about: { '@id': organization['@id'] } });
  const items = [['Início', origin + '/']];
  if (!home) {
    if (article) items.push(['Blog', origin + '/blog']);
    items.push([article?.title || title.replace(/ \| Recrutaê.*$/, ''), url]);
    graph.push(breadcrumb(items));
  }
  if (article) graph.push({
    '@type': 'Article', '@id': url + '#article', headline: article.title, description,
    mainEntityOfPage: { '@id': url + '#webpage' }, publisher: { '@id': organization['@id'] },
    author: article.author === 'Equipe Recrutaê' ? { '@type': 'Organization', name: 'Recrutaê', '@id': organization['@id'] } : { '@type': 'Person', name: article.author },
    datePublished: dateISO(article.date), dateModified: dateISO(article.modified || article.date),
    image: article.image ? new URL(article.image, origin).href : undefined, inLanguage: 'pt-BR',
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

module.exports = { pageSchema, serialize };
