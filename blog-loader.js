/* Blog list: one search/pagination controller; static content survives slow or failed requests. */
(() => {
  const SUPABASE_URL = 'https://niqouquemmtaokciaxpn.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcW91cXVlbW10YW9rY2lheHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTMyNzYsImV4cCI6MjA5NTU2OTI3Nn0.v7j1VxmRIIgxla9MEamhlDyGJNlRLAjC_GYkJyIG3w0';
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function boot() {
    const list = document.querySelector('.blog-post-list');
    if (!list) return;
    const input = document.getElementById('blogSearchInput');
    const more = document.getElementById('verMaisContainer');
    const button = document.getElementById('verMaisBtn');
    const empty = document.getElementById('noResultsMessage');
    if (empty) { empty.setAttribute('role', 'status'); empty.setAttribute('aria-live', 'polite'); }
    let expanded = false;
    function filter() {
      const rows = [...list.querySelectorAll('.blog-post-row')];
      const query = normalize(input?.value).trim();
      let visible = 0;
      rows.forEach((row, index) => {
        const matches = !query || normalize(row.textContent).includes(query);
        const show = matches && (query || expanded || index < 5);
        row.style.display = show ? 'grid' : 'none';
        row.classList.add('in-view');
        if (show) visible++;
      });
      if (more) { more.hidden = !!query || expanded || rows.length <= 5; more.style.display = more.hidden ? 'none' : 'block'; }
      if (empty) empty.style.display = visible ? 'none' : 'block';
    }
    input?.addEventListener('input', filter);
    button?.addEventListener('click', () => { expanded = true; filter(); });
    filter();
    list.setAttribute('aria-busy', 'true');
    fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=*&published=eq.true&order=published_at.desc`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }, signal: AbortSignal.timeout(5000),
    }).then(response => { if (!response.ok) throw Error('Content unavailable'); return response.json(); })
      .then(posts => {
        if (!Array.isArray(posts)) return;
        const published = posts.filter(post => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) && typeof post.title === 'string');
        if (!published.length) return;
        const fragment = document.createDocumentFragment();
        for (const post of published) {
          const link = document.createElement('a');
          link.href = `/blog-post?post=${encodeURIComponent(post.slug)}`;
          link.className = 'blog-post-row in-view';
          const thumbnail = document.createElement('div'); thumbnail.className = 'blog-post-thumb';
          const cover = post.cover_image || '/assets/blog/blog1_engenharia_v2.svg';
          if (/^(https:\/\/|\/?assets\/)/.test(cover)) {
            const image = document.createElement('img'); image.src = cover; image.alt = ''; image.loading = 'lazy'; image.style.cssText = 'width:100%;height:100%;object-fit:cover'; thumbnail.append(image);
          }
          const content = document.createElement('div'); content.className = 'blog-post-content';
          const meta = document.createElement('div'); meta.className = 'blog-post-meta';
          const date = document.createElement('span'); date.className = 'blog-post-date';
          const time = new Date(post.published_at); date.textContent = Number.isNaN(time.valueOf()) ? '' : time.toLocaleDateString('pt-BR');
          const tag = document.createElement('span'); tag.className = 'blog-post-tag'; tag.textContent = post.tag || 'Geral';
          meta.append(date, tag);
          const title = document.createElement('h2'); title.className = 'blog-post-title'; title.textContent = post.title;
          const excerpt = document.createElement('p'); excerpt.className = 'blog-post-preview'; excerpt.textContent = post.excerpt || '';
          content.append(meta, title, excerpt);
          const arrow = document.createElement('div'); arrow.className = 'blog-post-arrow'; arrow.textContent = '→'; arrow.setAttribute('aria-hidden', 'true');
          link.append(thumbnail, content, arrow); fragment.append(link);
        }
        list.replaceChildren(fragment); filter();
      }).catch(() => {}).finally(() => list.removeAttribute('aria-busy'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
