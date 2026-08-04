// ═══════════════════════════════════════════════════════════
// Recrutaê — Blog loader (site público)
// Carrega posts do Supabase e substitui os posts hardcoded.
// Se o Supabase estiver indisponível, mantém os posts estáticos.
// ═══════════════════════════════════════════════════════════

(function () {
  const SUPABASE_URL = 'https://niqouquemmtaokciaxpn.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcW91cXVlbW10YW9rY2lheHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTMyNzYsImV4cCI6MjA5NTU2OTI3Nn0.v7j1VxmRIIgxla9MEamhlDyGJNlRLAjC_GYkJyIG3w0';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const sanitize = (html) => {
    if (window.DOMPurify) {
      return DOMPurify.sanitize(html || '', {
        ALLOWED_TAGS: ['p', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'br', 'blockquote', 'img', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style']
      });
    }
    return html; // fallback (raro — o script inclui DOMPurify)
  };

  const fmtDateShort = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fmtDateLong = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // ─── Fetch de posts publicados (usando REST direto — sem SDK) ───
  async function fetchPublishedPosts() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=*&published=eq.true&order=published_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('[blog-loader] Falha ao buscar posts do Supabase, usando estáticos:', e.message);
      return null;
    }
  }

  async function fetchPostBySlug(slug) {
    try {
      const q = new URLSearchParams({ select: '*', slug: `eq.${slug}`, published: 'eq.true' });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?${q}`, {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.json();
      return arr[0] || null;
    } catch (e) {
      console.warn('[blog-loader] Falha ao buscar post do Supabase, usando estático:', e.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PÁGINA DE LISTA — blog.html
  // ═══════════════════════════════════════════════════════════
  async function renderBlogList() {
    const container = document.querySelector('.blog-post-list');
    if (!container) return;

    const posts = await fetchPublishedPosts();
    if (!posts || !posts.length) return; // mantém estáticos

    // Salva o container "Ver mais" pra reusar
    const verMaisContainer = document.getElementById('verMaisContainer');

    // Limpa posts hardcoded
    container.innerHTML = '';

    posts.forEach((p, i) => {
      const isExtra = i >= 5;
      const link = document.createElement('a');
      link.href = `blog-post.html?post=${encodeURIComponent(p.slug)}`;
      link.className = `blog-post-row animate-up${isExtra ? ' extra-post' : ''}${!isExtra && i > 0 ? ` stagger-${i}` : ''}`;
      if (isExtra) link.style.cssText = 'display:none; opacity:1; transform:none;';

      const excerpt = p.excerpt || (p.content_html || '')
        .replace(/<[^>]+>/g, '')
        .trim()
        .slice(0, 180) + '...';
      const cover = p.cover_image || 'assets/blog/blog1_engenharia_v2.svg';

      link.innerHTML = `
        <div class="blog-post-thumb" style="background: url('${esc(cover).replace(/'/g, '%27')}') center/cover no-repeat;"></div>
        <div class="blog-post-content">
          <div class="blog-post-meta">
            <span class="blog-post-date">${esc(fmtDateShort(p.published_at))}</span>
            <span class="blog-post-tag">${esc(p.tag || 'Geral')}</span>
          </div>
          <h2 class="blog-post-title">${esc(p.title)}</h2>
          <p class="blog-post-preview">${esc(excerpt)}</p>
        </div>
        <div class="blog-post-arrow">→</div>
      `;
      container.appendChild(link);
    });

    // Se tem 5 ou menos posts, esconde o "Ver mais"
    if (posts.length <= 5 && verMaisContainer) {
      verMaisContainer.style.display = 'none';
    }

    // Re-registra o observer de animação se existir
    if (typeof window.IntersectionObserver !== 'undefined') {
      document.querySelectorAll('.animate-up').forEach(el => {
        if (!el.classList.contains('in-view')) {
          setTimeout(() => el.classList.add('in-view'), 100);
        }
      });
    }

    // Re-registra o search
    reinitBlogSearch();
  }

  function reinitBlogSearch() {
    const searchInput = document.getElementById('blogSearchInput');
    if (!searchInput || searchInput.dataset.reinited === '1') return;
    searchInput.dataset.reinited = '1';

    const allPosts = document.querySelectorAll('.blog-post-row');
    const verMaisContainer = document.getElementById('verMaisContainer');
    const noResultsMessage = document.getElementById('noResultsMessage');

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      let visibleCount = 0;

      if (query.length > 0) {
        if (verMaisContainer) verMaisContainer.style.display = 'none';
        allPosts.forEach(post => {
          const title = post.querySelector('.blog-post-title')?.textContent.toLowerCase() || '';
          const tag = post.querySelector('.blog-post-tag')?.textContent.toLowerCase() || '';
          if (title.includes(query) || tag.includes(query)) {
            post.style.display = 'grid';
            visibleCount++;
          } else {
            post.style.display = 'none';
          }
        });
        if (noResultsMessage) {
          noResultsMessage.style.display = visibleCount === 0 ? 'block' : 'none';
        }
      } else {
        if (noResultsMessage) noResultsMessage.style.display = 'none';
        allPosts.forEach(post => {
          post.style.display = post.classList.contains('extra-post') ? 'none' : 'grid';
        });
        if (verMaisContainer && document.querySelectorAll('.extra-post').length > 0) {
          verMaisContainer.style.display = 'block';
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PÁGINA INDIVIDUAL — blog-post.html
  // ═══════════════════════════════════════════════════════════
  async function renderBlogPost() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('post');
    if (!slug) return;

    // Sinaliza cedo para bloquear o fallback estático enquanto o fetch acontece
    window.__blogLoaderPending = true;

    const post = await fetchPostBySlug(slug);
    if (!post) {
      // Libera o fallback estático (blog-data.js) rodar
      window.__blogLoaderPending = false;
      return;
    }

    // Atualiza meta tags
    document.title = `${post.title} | Recrutaê Blog`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', post.excerpt || post.title);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', post.title);
    document.querySelector('meta[property="twitter:title"]')?.setAttribute('content', post.title);
    if (post.cover_image) {
      document.querySelector('meta[property="og:image"]')?.setAttribute('content', post.cover_image);
      document.querySelector('meta[property="twitter:image"]')?.setAttribute('content', post.cover_image);
    }

    // Atualiza breadcrumb + badge
    const bcLast = document.querySelector('.breadcrumb span:last-child');
    if (bcLast) bcLast.textContent = post.tag || 'Blog';
    const badge = document.querySelector('.badge.badge-gold');
    if (badge) badge.textContent = post.tag || 'Blog';

    // Atualiza título hero
    const titleEl = document.querySelector('.page-hero-title');
    if (titleEl) titleEl.textContent = post.title;

    // Meta info (data + read_time + autor)
    const authorLine = post.author_name || 'Equipe Recrutaê';
    const readTime = post.read_time || '5 min de leitura';
    const dateStr = fmtDateLong(post.published_at);
    const metaEl = document.querySelector('.article-meta');
    if (metaEl) {
      metaEl.innerHTML = `${esc(dateStr)} &nbsp;·&nbsp; ${esc(readTime)} &nbsp;·&nbsp; ${esc(authorLine)}`;
    }

    // Capa
    const heroImg = document.querySelector('.article-hero-img');
    if (heroImg && post.cover_image) {
      heroImg.style.background = `url('${post.cover_image.replace(/'/g, '%27')}') center/cover no-repeat`;
    }

    // Corpo (com sanitize)
    const bodyEl = document.querySelector('.article-body');
    if (bodyEl) {
      bodyEl.innerHTML = sanitize(post.content_html || '');
    }

    // Tags
    const tagsContainer = document.querySelector('.article-tags');
    if (tagsContainer) {
      tagsContainer.innerHTML = `<span class="chip">${esc(post.tag || 'Blog')}</span>`;
    }

    // Se tiver foto do autor, adiciona antes do meta
    if (post.author_photo && metaEl) {
      const authorEl = document.createElement('div');
      authorEl.className = 'article-author-block';
      authorEl.innerHTML = `
        <img src="${esc(post.author_photo)}" alt="${esc(authorLine)}"
             style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--gold, #F5B914);vertical-align:middle;margin-right:12px">
        <span style="vertical-align:middle;font-weight:600">${esc(authorLine)}</span>
      `;
      authorEl.style.cssText = 'margin-top:16px;display:flex;align-items:center;gap:0;font-size:14px;color:var(--text-muted, #6B6860)';
      metaEl.parentNode?.insertBefore(authorEl, metaEl.nextSibling);
    }

    // Sinaliza pro fallback estático (blog-data.js) não sobrescrever
    window.__blogLoaderRendered = true;
  }

  // ═══════════════════════════════════════════════════════════
  // DISPATCH
  // ═══════════════════════════════════════════════════════════
  function boot() {
    const path = location.pathname.toLowerCase();
    if (path.includes('/blog-post')) {
      renderBlogPost();
    } else if (path.includes('/blog')) {
      renderBlogList();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
