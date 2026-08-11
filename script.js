/* =========================================================
   RECRUTAÊ — MAIN SCRIPT
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const safe = (fn, name) => { try { fn(); } catch (e) { console.warn('[recrutae] init error in ' + name, e); } };
  safe(initNavbar, 'navbar');
  safe(initMobileMenu, 'mobileMenu');
  safe(initMarquee, 'marquee');
  safe(initIndustries, 'industries');
  safe(initScrollAnimations, 'scrollAnimations');
  safe(initCounters, 'counters');
  safe(initCarousel, 'carousel');
  safe(initForm, 'form');
  safe(initSmoothScroll, 'smoothScroll');
  safe(initPageTransitions, 'pageTransitions');
  safe(initInstagram, 'instagram');
  safe(initAnalytics, 'analytics');

  // Safety net: nothing stays invisible if the IntersectionObserver fails
  setTimeout(() => {
    document.querySelectorAll('.animate-up:not(.in-view), .reveal-right:not(.in-view)').forEach(el => el.classList.add('in-view'));
  }, 1500);
});

/* =========================================================
   ANALYTICS — Simple tracking for page views and CTAs
   ========================================================= */
const ANALYTICS_URL  = 'https://niqouquemmtaokciaxpn.supabase.co/rest/v1/analytics_events';
const ANALYTICS_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcW91cXVlbW10YW9rY2lheHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTMyNzYsImV4cCI6MjA5NTU2OTI3Nn0.v7j1VxmRIIgxla9MEamhlDyGJNlRLAjC_GYkJyIG3w0';

function initAnalytics() {
  // 1. Get or create Session ID
  let sid = localStorage.getItem('rec_sid');
  if (!sid) {
    sid = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('rec_sid', sid);
  }

  const track = async (type, meta = {}) => {
    try {
      fetch(ANALYTICS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANALYTICS_KEY,
          'Authorization': `Bearer ${ANALYTICS_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          session_id: sid,
          event_type: type,
          page: location.pathname,
          meta: {
            ...meta,
            referrer: document.referrer,
            screen: `${window.innerWidth}x${window.innerHeight}`,
            ua: navigator.userAgent
          }
        })
      });
    } catch (e) { /* silent */ }
  };

  // 2. Track Page View
  track('page_view');

  // 3. Track CTA Clicks
  document.querySelectorAll('.btn, .btn-gold, .btn-cta-nav, .busca-start-btn, .btn-wapp').forEach(btn => {
    btn.addEventListener('click', () => {
      track('cta_click', { 
        text: btn.innerText.trim().slice(0, 50),
        id: btn.id || null,
        class: btn.className
      });
    });
  });
}

/* =========================================================
   NAVBAR
   ========================================================= */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  // Navbar is now always light/cream (matches the design template).
  // We only toggle a `.scrolled` class for the compact + glassy variant.
  // Legacy `transparent / on-dark / on-light / solid` classes are kept on the
  // element so other selectors still apply, but they all render identically.
  function update() {
    if (window.scrollY > 20) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* =========================================================
   MOBILE MENU
   ========================================================= */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const overlay = document.getElementById('mobileOverlay');
  if (!hamburger || !overlay) return;

  const menuData = [
    { label: 'Sou empresa', sub: [
      { label: 'Recrutamento e Seleção', href: 'recrutamento-selecao.html' },
      { label: 'Alocação', href: 'alocacao.html' }
    ]},
    { label: 'Sou candidato', href: 'sou-candidato.html' },
    { label: 'Blog', href: 'blog.html' },
    { label: 'Indústrias', sub: [
      { label: 'Tecnologia', href: 'industria-template.html?ind=tecnologia' },
      { label: 'Telecom', href: 'industria-template.html?ind=telecom' },
      { label: 'Mídia', href: 'industria-template.html?ind=midia' },
      { label: 'Varejo', href: 'industria-template.html?ind=varejo' },
      { label: 'Bens de Consumo', href: 'industria-template.html?ind=bens-consumo' },
      { label: 'Logística', href: 'industria-template.html?ind=logistica' },
      { label: 'Serviços Financeiros', href: 'industria-template.html?ind=servicos-financeiros' },
      { label: 'Banking', href: 'industria-template.html?ind=banking' },
      { label: 'Agro', href: 'industria-template.html?ind=agro' },
      { label: 'Energia', href: 'industria-template.html?ind=energia' },
      { label: 'Seguros', href: 'industria-template.html?ind=seguros' },
      { label: 'Educação', href: 'industria-template.html?ind=educacao' },
      { label: 'Saúde', href: 'industria-template.html?ind=saude' },
      { label: 'Games', href: 'industria-template.html?ind=games' },
    ]},
    { label: 'Posições', sub: [
      { label: 'Bancos e Serviços Financeiros', href: 'posicao-template.html?pos=bancos-financeiros' },
      { label: 'Engenharia e Manufatura', href: 'posicao-template.html?pos=engenharia-manufatura' },
      { label: 'Financeiro e Tributário', href: 'posicao-template.html?pos=financeiro-tributario' },
      { label: 'Imobiliário e Construção', href: 'posicao-template.html?pos=imobiliario-construcao' },
      { label: 'Jurídico e Legal', href: 'posicao-template.html?pos=juridico-legal' },
      { label: 'Marketing/Comunicação/Digital', href: 'posicao-template.html?pos=marketing-comunicacao' },
      { label: 'Operações/Logística/Supply Chain', href: 'posicao-template.html?pos=operacoes-logistica' },
      { label: 'Petróleo e Gás', href: 'posicao-template.html?pos=petroleo-gas' },
      { label: 'Recursos Humanos', href: 'posicao-template.html?pos=recursos-humanos' },
      { label: 'Saúde e Ciências', href: 'posicao-template.html?pos=saude-ciencias' },
      { label: 'Seguros', href: 'posicao-template.html?pos=seguros' },
      { label: 'Tecnologia da Informação', href: 'posicao-template.html?pos=tecnologia-informacao' },
      { label: 'Varejo', href: 'posicao-template.html?pos=varejo' },
      { label: 'Vendas', href: 'posicao-template.html?pos=vendas' },
    ]}
  ];

  const chevronSVG = `<svg class="chevron" width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  let html = '';
  menuData.forEach(item => {
    if (!item.sub) {
      html += `<a href="${item.href}" class="mob-link">${item.label}</a>`;
    } else {
      const id = 'mob-' + item.label.replace(/\s/g, '').toLowerCase();
      html += `<button class="mob-acc-btn" data-target="${id}">${item.label}${chevronSVG}</button>`;
      html += `<div class="mob-submenu" id="${id}">`;
      item.sub.forEach(s => { html += `<a href="${s.href}">${s.label}</a>`; });
      html += `</div>`;
    }
  });
  html += `<div class="mob-cta"><a href="#contato" class="btn btn-gold btn-full" onclick="closeMobileMenu()">Agendar Reunião</a></div>`;
  overlay.innerHTML = html;

  // Accordion
  overlay.querySelectorAll('.mob-acc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      btn.classList.toggle('open');
      target.classList.toggle('open');
    });
  });

  // Close on link
  overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileMenu));

  function openMobileMenu() {
    overlay.classList.add('active');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileMenu() {
    overlay.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.style.overflow = '';
  }
  window.closeMobileMenu = closeMobileMenu;

  hamburger.addEventListener('click', () => {
    overlay.classList.contains('active') ? closeMobileMenu() : openMobileMenu();
  });
}

/* =========================================================
   MARQUEE — branded text wordmarks (always renders, no external deps)
   ========================================================= */
function initMarquee() {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  // If logos are already baked into the HTML, don't overwrite them.
  if (track.children.length > 0) return;

  const companies = [
    { name: 'Itaú',          color: '#EC7000', style: 'bold' },
    { name: 'Santander',     color: '#EC0000', style: 'bold' },
    { name: 'Mercado Livre', color: '#2D3277', style: 'normal' },
    { name: 'iFood',         color: '#EA1D2C', style: 'bold' },
    { name: 'Nubank',        color: '#820AD1', style: 'bold' },
    { name: 'Ambev',         color: '#0B1F3A', style: 'normal' },
    { name: 'Natura',        color: '#F36E21', style: 'normal' },
    { name: 'TOTVS',         color: '#0049A4', style: 'upper' },
    { name: 'BTG Pactual',   color: '#0F2A4A', style: 'serif' },
    { name: 'XP Inc.',       color: '#000000', style: 'bold' },
    { name: 'Magalu',        color: '#0086FF', style: 'bold' },
    { name: 'Bradesco',      color: '#CC092F', style: 'normal' },
    { name: 'Vivo',          color: '#660099', style: 'bold' },
    { name: 'Embraer',       color: '#003DA5', style: 'upper' },
    { name: 'Petrobras',     color: '#008542', style: 'upper' },
    { name: 'Vale',          color: '#EEC524', style: 'upper' },
    { name: 'Claro',         color: '#E50000', style: 'bold' },
    { name: 'TIM',           color: '#003B71', style: 'upper' }
  ];

  const set = companies.map(c =>
    `<div class="logo-item logo-${c.style}" title="${c.name}">
      <span class="logo-text" style="--brand:${c.color}">${c.name}</span>
    </div>`
  ).join('');

  track.innerHTML = set + set;
}

/* =========================================================
   INDUSTRIES GRID
   ========================================================= */
function initIndustries() {
  const grid = document.getElementById('industriesGrid');
  if (!grid) return;

  // Ícone de linha 24x24, herda a cor do card
  const ico = (paths) => `<span class="ind-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg></span>`;

  const items = [
    { name: 'Tecnologia',           href: 'industria-template.html?ind=tecnologia',
      icon: ico('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>') },
    { name: 'Telecom',              href: 'industria-template.html?ind=telecom',
      icon: ico('<circle cx="12" cy="12" r="2"/><path d="M7.8 16.2a6 6 0 0 1 0-8.5M16.2 7.7a6 6 0 0 1 0 8.5"/><path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>') },
    { name: 'Mídia',                href: 'industria-template.html?ind=midia',
      icon: ico('<rect x="2" y="4" width="20" height="15" rx="3"/><path d="M8 22h8"/><path d="m10.5 9 4.5 2.6-4.5 2.6z"/>') },
    { name: 'Varejo',               href: 'industria-template.html?ind=varejo',
      icon: ico('<path d="M6.5 2 3.5 6.5V20a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V6.5L17.5 2z"/><path d="M3.5 6.5h17"/><path d="M16 10.5a4 4 0 0 1-8 0"/>') },
    { name: 'Bens de Consumo',      href: 'industria-template.html?ind=bens-consumo',
      icon: ico('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7.2 8.7 5 8.7-5"/><path d="M12 22.1V12.2"/><path d="m7.5 4.6 9 5.2"/>') },
    { name: 'Logística',            href: 'industria-template.html?ind=logistica',
      icon: ico('<path d="M14 17.5V6.5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 2 6.5v10A1 1 0 0 0 3 17.5h1.5"/><path d="M14 9h3.6a2 2 0 0 1 1.6.8l2.4 3.2v3.5a1 1 0 0 1-1 1h-1"/><circle cx="7" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/><path d="M9 18h6.5"/>') },
    { name: 'Serviços Financeiros', href: 'industria-template.html?ind=servicos-financeiros',
      icon: ico('<path d="M3 3v18h18"/><path d="m7 14 3.5-3.5 3 3L19 7"/><path d="M14.5 7H19v4.5"/>') },
    { name: 'Banking',              href: 'industria-template.html?ind=banking',
      icon: ico('<path d="m3 10 9-6 9 6"/><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8"/><path d="M2.5 21h19"/>') },
    { name: 'Agro',                 href: 'industria-template.html?ind=agro',
      icon: ico('<path d="M12 20.5V8.5"/><path d="M12 12.5C12 8.6 8.9 5.5 5 5.5c0 3.9 3.1 7 7 7z"/><path d="M12 15.5c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6z"/><path d="M6.5 20.5h11"/>') },
    { name: 'Energia',              href: 'industria-template.html?ind=energia',
      icon: ico('<path d="M13 2 3.8 13.4a.6.6 0 0 0 .5 1H11l-1 7.6 9.2-11.4a.6.6 0 0 0-.5-1H12z"/>') },
    { name: 'Seguros',              href: 'industria-template.html?ind=seguros',
      icon: ico('<path d="M12 22s8-4 8-10V5.2L12 2 4 5.2V12c0 6 8 10 8 10z"/><path d="m9 11.8 2.2 2.2 4-4.2"/>') },
    { name: 'Educação',             href: 'industria-template.html?ind=educacao',
      icon: ico('<path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6.5 11.3V16c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.7"/><path d="M22 9v6"/>') },
    { name: 'Saúde',                href: 'industria-template.html?ind=saude',
      icon: ico('<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/><path d="M3.3 13h4.2l1-2 2 4.5 2-6.5 1.5 4h6.7"/>') },
    { name: 'Games',                href: 'industria-template.html?ind=games',
      icon: ico('<path d="M17.3 5.5H6.7a4 4 0 0 0-4 3.6C2.6 9.8 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4a2 2 0 0 1 1.4-.6h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.2-.7-6.9a4 4 0 0 0-4-3.6z"/><path d="M6.5 11h3.5M8.2 9.2v3.5"/><path d="M15.2 12.2h.01M17.8 10h.01"/>') },
  ];

  const arrowSVG = `<svg class="ind-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12L12 2M12 2H5M12 2v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  grid.innerHTML = items.map((item, i) => {
    const idx = String(i + 1).padStart(2, '0');
    const delay = i % 4;
    const stagger = delay > 0 ? ` stagger-${delay}` : '';
    return `
      <a href="${item.href}" class="ind-card animate-up${stagger}">
        <span class="ind-top">
          ${item.icon}
          <span class="ind-idx">${idx}</span>
        </span>
        <span class="ind-name">${item.name}</span>
        ${arrowSVG}
      </a>`;
  }).join('');

  // Mouse-follow glow on industry cards
  grid.querySelectorAll('.ind-card').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mx', mx + '%');
      card.style.setProperty('--my', my + '%');
    });
  });
}

/* =========================================================
   SCROLL ANIMATIONS
   ========================================================= */
function initScrollAnimations() {
  const els = document.querySelectorAll('.animate-up, .reveal-right');
  if (!els.length) return;

  const vh = window.innerHeight || document.documentElement.clientHeight;
  els.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.95) el.classList.add('in-view');
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => { if (!el.classList.contains('in-view')) obs.observe(el); });
}

/* =========================================================
   BLOG ART & INSTAGRAM
   ========================================================= */
function initBlogArt() {
  const thumbs = document.querySelectorAll('.blog-thumb');
  const gradients = [
    'linear-gradient(135deg, #0A0918 0%, #1F1C4B 100%)',
    'linear-gradient(135deg, #1F1C4B 0%, #D4A010 100%)',
    'linear-gradient(135deg, #D4A010 0%, #0A0918 100%)'
  ];

  thumbs.forEach((thumb, i) => {
    const art = document.createElement('div');
    art.className = 'blog-cover-art';
    art.style.background = gradients[i % gradients.length];
    art.innerHTML = `
      <div class="blog-cover-overlay"></div>
      <svg style="position:absolute; inset:0; width:100%; height:100%; opacity:0.05" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0 100 L100 0 L100 100 Z" fill="white" />
      </svg>
    `;
    thumb.prepend(art);
  });
}

function initInstagram() {
  const grid = document.querySelector('.insta-grid');
  const section = document.querySelector('.instagram');
  if (!grid || !section) return;

  const FEED_URL = 'https://niqouquemmtaokciaxpn.supabase.co/functions/v1/instagram-feed?limit=3';
  const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  fetch(FEED_URL)
    .then(r => r.json())
    .then(data => {
      if (!data?.success || !Array.isArray(data.posts) || !data.posts.length) {
        // API do Instagram ainda não configurada/indisponível — mantém as
        // 3 imagens reais de posts (fallback) já presentes no HTML
        return;
      }

      grid.innerHTML = data.posts.map(post => `
        <a href="${escHtml(post.permalink)}" target="_blank" rel="noopener" class="insta-item"
           style="background-image:url('${escHtml(post.image).replace(/'/g, '%27')}'); background-size:cover; background-position:center; border-radius:16px;"
           title="${escHtml(post.caption)}">
          <div class="insta-overlay">Ver no Instagram</div>
        </a>
      `).join('');
    })
    .catch(() => {
      // Falha de rede/API — mantém o fallback estático já presente no HTML
    });
}

/* =========================================================
   COUNTER ANIMATION
   ========================================================= */
function initCounters() {
  const counters = document.querySelectorAll('.counter');
  if (!counters.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target, parseInt(entry.target.dataset.target));
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => obs.observe(el));
}

function animateCount(el, target) {
  const dur = 1600;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* =========================================================
   TESTIMONIALS CAROUSEL
   ========================================================= */
function initCarousel() {
  const slides = document.querySelectorAll('.testi-slide');
  const dots   = document.querySelectorAll('.dot');
  const prev   = document.getElementById('carouselPrev');
  const next   = document.getElementById('carouselNext');
  if (!slides.length) return;

  let cur = 0, timer;

  function go(i) {
    slides[cur].classList.remove('active');
    dots[cur]?.classList.remove('active');
    cur = (i + slides.length) % slides.length;
    slides[cur].classList.add('active');
    dots[cur]?.classList.add('active');
  }

  function start() { timer = setInterval(() => go(cur + 1), 5000); }
  function stop()  { clearInterval(timer); }

  prev?.addEventListener('click', () => { stop(); go(cur - 1); start(); });
  next?.addEventListener('click', () => { stop(); go(cur + 1); start(); });
  dots.forEach(d => d.addEventListener('click', () => { stop(); go(+d.dataset.index); start(); }));

  start();
}

/* =========================================================
   CONTACT FORM — real submission to Supabase Edge Function
   (saves to the contact_leads table + emails the recruiter,
    so every lead shows up in the admin page and the inbox)
   ========================================================= */
const CONTACT_ENDPOINT = 'https://niqouquemmtaokciaxpn.supabase.co/functions/v1/submit-contact';

function initForm() {
  document.querySelectorAll('form.contact-form').forEach(setupContactForm);
}

function setupContactForm(form) {
  const success = form.querySelector('.form-success');
  const btn     = form.querySelector('[type=submit]');
  const btnText = btn?.querySelector('span');
  const defaultLabel = btnText ? btnText.textContent : 'Enviar mensagem';

  const setErr = (el, msg) => {
    const g = el.closest('.form-group');
    g?.classList.add('has-error');
    const span = g?.querySelector('.form-error');
    if (span) span.textContent = msg;
  };
  const clrErr = (el) => {
    const g = el.closest('.form-group');
    g?.classList.remove('has-error');
    const span = g?.querySelector('.form-error');
    if (span) span.textContent = '';
  };

  const nome  = form.querySelector('[name=nome]');
  const email = form.querySelector('[name=email]');
  [nome, email].forEach(el => el?.addEventListener('blur', () => { if (el.value.trim()) clrErr(el); }));

  const showResult = (okState) => {
    if (!success) return;
    const icon = okState
      ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v5M10 13.5h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const msg = okState
      ? 'Mensagem enviada! Entraremos em contato em breve.'
      : 'Não foi possível enviar agora. Tente novamente ou escreva para contato@recrutae.com.br.';
    success.innerHTML = icon + '<span>' + msg + '</span>';
    success.style.display = 'flex';
    success.classList.add('visible');
    success.style.borderColor = okState ? '' : 'rgba(248,113,113,0.4)';
    success.style.color = okState ? '' : '#F87171';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let ok = true;
    if (nome)  { clrErr(nome);  if (!nome.value.trim())  { setErr(nome,  'Informe seu nome.'); ok = false; } }
    if (email) {
      clrErr(email);
      if (!email.value.trim()) { setErr(email, 'Informe seu e-mail.'); ok = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { setErr(email, 'E-mail inválido.'); ok = false; }
    }
    if (!ok) return;

    const val = n => form.querySelector(`[name=${n}]`)?.value.trim() || '';
    const payload = {
      name:       val('nome'),
      email:      val('email'),
      phone:      val('telefone'),
      company:    val('empresa'),
      role:       val('cargo'),
      country:    val('pais'),
      types:      [...form.querySelectorAll('input[name=tipo]:checked')].map(c => c.value),
      sourcePage: (document.title || '').replace(/\s*[—|].*$/, '').trim() || location.pathname,
    };

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Enviando…';

    try {
      const resp = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('status ' + resp.status);
      form.reset();
      showResult(true);
    } catch (err) {
      console.error('[recrutae] envio de contato falhou', err);
      showResult(false);
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = defaultLabel;
    }
  });
}

/* =========================================================
   SMOOTH SCROLL
   ========================================================= */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      
      // Se for um dos botões principais de CTA que levam ao final/contato, 
      // podemos dar um feedback visual ou garantir um scroll bem fluido.
      const isCta = a.textContent.includes('Enviar') || a.textContent.includes('Reunião') || a.textContent.includes('contato');
      
      const offset = (document.getElementById('navbar')?.offsetHeight || 72) + 20;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - offset;
      
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      });

      // Se for mobile, fecha o menu
      if (window.closeMobileMenu) window.closeMobileMenu();
    });
  });
}

/* =========================================================
   PAGE TRANSITIONS
   ========================================================= */
function initPageTransitions() {
  let overlay = document.getElementById('page-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-overlay';
    document.body.insertBefore(overlay, document.body.firstChild);
  }

  document.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || a.target === '_blank' || a.classList.contains('no-transition')) return;
    
    // Ignora links internos, protocolos e links externos
    if (
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      /^https?:\/\//.test(href) ||
      href.includes('wa.me')
    ) return;

    a.addEventListener('click', e => {
      // Verifica se é um clique simples (sem ctrl/cmd)
      if (e.metaKey || e.ctrlKey) return;

      e.preventDefault();
      const dest = a.href;
      overlay.classList.add('active');
      
      // Reduzimos o timeout para 250ms para ser mais responsivo (combina com o ease-in do CSS)
      setTimeout(() => { 
        window.location.href = dest; 
      }, 250);
    });
  });
}
