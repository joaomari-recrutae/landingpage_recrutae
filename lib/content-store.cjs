const config = require('./public-content-config.cjs');
const cache = new Map();

async function loadPost(slug) {
  const cached = cache.get(slug);
  if (cached && cached.until > Date.now()) return cached.post;
  const query = new URLSearchParams({ select: '*', slug: `eq.${slug}`, published: 'eq.true', limit: '1' });
  try {
    const response = await fetch(`${config.endpoint}/rest/v1/blog_posts?${query}`, {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) throw new Error(`Content status ${response.status}`);
    const rows = await response.json();
    const post = Array.isArray(rows) && rows[0]?.slug === slug ? rows[0] : null;
    cache.set(slug, { post, until: Date.now() + 60000 });
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    return post;
  } catch {
    if (cached?.post) return cached.post;
    throw new Error('Published content unavailable');
  }
}

module.exports = { loadPost };
