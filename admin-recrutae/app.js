// ═══════════════════════════════════════════════════════════
// Recrutaê Admin — App core (Auth, Tabs, Analytics, Leads, Contatos)
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://niqouquemmtaokciaxpn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcW91cXVlbW10YW9rY2lheHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTMyNzYsImV4cCI6MjA5NTU2OTI3Nn0.v7j1VxmRIIgxla9MEamhlDyGJNlRLAjC_GYkJyIG3w0';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'recrutae-admin-auth' }
});

// Expor globalmente pra o blog-admin.js usar
window.sb = sb;

// Escape HTML pra prevenir XSS na renderização de textos vindos do DB
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

let allLeads = [];
let allContacts = [];

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    showApp(session.user);
  } else {
    document.getElementById('login-email')?.focus();
  }

  // Reagir a logout em outra aba
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      const app = document.getElementById('app');
      const login = document.getElementById('login-screen');
      if (app && login) {
        app.style.display = 'none';
        login.style.display = 'flex';
      }
    }
  });
}

async function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('btn-login');
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';

  if (!email || !password) {
    errEl.textContent = 'Preencha email e senha.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Entrando…';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    errEl.textContent = 'Credenciais inválidas. Verifique email e senha.';
    btn.disabled = false;
    btn.textContent = 'Entrar';
    return;
  }
  showApp(data.user);
}

async function doLogout() {
  await sb.auth.signOut();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-password').value = '';
}

function showApp(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-email-display').textContent = user.email;
  loadAnalytics();
  loadLeads();
  loadContacts();
  // Blog é carregado pelo blog-admin.js
  if (typeof window.loadPosts === 'function') window.loadPosts();
}

// ═══════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if (navEl) navEl.classList.add('active');

  // Reset blog list view when switching to blog tab
  if (tab === 'blog' && typeof window.showPostList === 'function') {
    window.showPostList();
  }
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════
async function loadAnalytics() {
  const { data, error } = await sb
    .from('analytics_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error || !data) {
    console.error(error);
    document.getElementById('events-list').innerHTML =
      '<p style="color:#f87171;font-size:13px;padding:8px 0">Erro ao carregar analytics: ' + esc(error?.message || '') + '</p>';
    return;
  }

  const events = data;
  const byType = {};
  events.forEach(e => { byType[e.event_type] = (byType[e.event_type] || 0) + 1; });

  const views    = byType['page_view']       || 0;
  const cta      = byType['cta_click']       || 0;
  const starts   = byType['wizard_start']    || 0;
  const complete = byType['wizard_complete'] || 0;
  const convRate = starts ? Math.round(complete / starts * 100) : 0;

  document.getElementById('kpi-views').textContent      = views;
  document.getElementById('kpi-views-sub').textContent  = `${views > 0 && cta > 0 ? Math.round(cta / views * 100) : 0}% clicaram em CTA`;
  document.getElementById('kpi-cta').textContent        = cta;
  document.getElementById('kpi-cta-sub').textContent    = 'cliques em botões CTA';
  document.getElementById('kpi-starts').textContent     = starts;
  document.getElementById('kpi-starts-sub').textContent = 'formulários iniciados';
  document.getElementById('kpi-complete').textContent   = complete;
  document.getElementById('kpi-conv-rate').textContent  = `${convRate}% taxa de conclusão`;

  // ── Pages chart ──
  const byPage = {};
  events.filter(e => e.event_type === 'page_view').forEach(e => {
    const p = e.page || '/';
    byPage[p] = (byPage[p] || 0) + 1;
  });
  const pagesEl = document.getElementById('pages-chart');
  const sortedPages = Object.entries(byPage).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const maxP = sortedPages[0]?.[1] || 1;
  pagesEl.innerHTML = sortedPages.map(([page, count]) => `
    <div class="bar-row">
      <div class="bar-label" title="${esc(page)}">${esc(page.length > 24 ? page.slice(0, 24) + '…' : page)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${count / maxP * 100}%"></div></div>
      <div class="bar-count">${count}</div>
    </div>
  `).join('') || '<p style="color:var(--muted);font-size:13px;padding:8px 0">Sem dados</p>';

  // ── Referrer chart ──
  const byRef = {};
  events.filter(e => e.event_type === 'page_view').forEach(e => {
    let r = e.meta?.referrer;
    if (!r || r === '') r = 'Direto';
    else {
      try { r = new URL(r).hostname; } catch {}
    }
    byRef[r] = (byRef[r] || 0) + 1;
  });
  const refEl = document.getElementById('referrer-chart');
  const sortedRef = Object.entries(byRef).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const maxR = sortedRef[0]?.[1] || 1;
  refEl.innerHTML = sortedRef.map(([ref, count]) => `
    <div class="bar-row">
      <div class="bar-label" title="${esc(ref)}">${esc(ref.length > 24 ? ref.slice(0, 24) + '…' : ref)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${count / maxR * 100}%;background:var(--blue)"></div></div>
      <div class="bar-count">${count}</div>
    </div>
  `).join('') || '<p style="color:var(--muted);font-size:13px;padding:8px 0">Sem dados</p>';

  // ── Timeline — últimos 21 dias ──
  const days = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const byDay = {};
  events.forEach(e => {
    const d = e.created_at?.slice(0, 10);
    if (d) byDay[d] = (byDay[d] || 0) + 1;
  });
  const maxDay = Math.max(...days.map(d => byDay[d] || 0), 1);
  const timelineEl = document.getElementById('timeline-chart');
  timelineEl.innerHTML = `<div class="timeline-grid">${days.map(d => {
    const count = byDay[d] || 0;
    const h = Math.max(count / maxDay * 56, count > 0 ? 4 : 2);
    const label = d.slice(5).replace('-', '/');
    return `<div class="day-col">
      <div class="day-bar-wrap"><div class="day-bar" style="height:${h}px" title="${d}: ${count} evento${count !== 1 ? 's' : ''}"></div></div>
      <div class="day-label">${label}</div>
    </div>`;
  }).join('')}</div>`;

  // ── Recent events ──
  const eventsEl = document.getElementById('events-list');
  const recent = events.slice(0, 25);
  if (!recent.length) {
    eventsEl.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:8px 0">Sem eventos recentes.</p>';
    return;
  }
  eventsEl.innerHTML = `
    <table class="events-table">
      <thead>
        <tr><th>Evento</th><th>Página</th><th>Sessão</th><th>Data / Hora</th></tr>
      </thead>
      <tbody>
        ${recent.map(e => `
          <tr>
            <td><span class="event-chip chip-${esc(e.event_type)}">${esc(e.event_type)}</span></td>
            <td class="td-muted">${esc(e.page || '—')}</td>
            <td class="td-mono">${esc((e.session_id || '').slice(0, 12))}…</td>
            <td class="td-date">${fmtDate(e.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// ═══════════════════════════════════════════════════════════
// LEADS (candidate_searches)
// ═══════════════════════════════════════════════════════════
async function loadLeads() {
  const { data, error } = await sb
    .from('candidate_searches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('leads-list').innerHTML =
      `<div class="loading-center" style="color:#f87171">Erro ao carregar leads: ${esc(error.message)}</div>`;
    return;
  }
  allLeads = data || [];
  renderLeads(allLeads);
}

function filterLeads() {
  const q      = document.getElementById('lead-search').value.toLowerCase();
  const status = document.getElementById('status-filter').value;
  const filtered = allLeads.filter(l => {
    const matchQ = !q || [l.contact_name, l.company_name, l.contact_role, l.job_description?.titulo_vaga]
      .join(' ').toLowerCase().includes(q);
    const matchS = !status || l.status === status;
    return matchQ && matchS;
  });
  renderLeads(filtered);
}

function renderLeads(leads) {
  document.getElementById('leads-count').textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''}`;
  const el = document.getElementById('leads-list');
  if (!leads.length) {
    el.innerHTML = '<div class="loading-center" style="color:var(--muted)">Nenhum lead encontrado.</div>';
    return;
  }
  el.innerHTML = leads.map(buildLeadCard).join('');
}

function buildLeadCard(l) {
  const jd = l.job_description || {};
  const initials = (l.contact_name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const statusLabel = { new: 'Novo', contacted: 'Contactado', converted: 'Convertido', disqualified: 'Desqualificado' };
  const waLink = l.contact_phone ? `https://wa.me/55${l.contact_phone.replace(/\D/g, '')}` : null;
  const tagList = arr => arr?.map(x => `<span class="tag">${esc(x)}</span>`).join('') || '—';

  return `
  <div class="lead-card" id="card-${esc(l.id)}">
    <div class="lead-header" onclick="toggleLead('${esc(l.id)}')">
      <div class="lead-avatar">${esc(initials)}</div>
      <div class="lead-info">
        <div class="lead-name">
          ${esc(l.contact_name || 'Sem nome')}
          <span class="status-badge status-${esc(l.status || 'new')}">${esc(statusLabel[l.status] || l.status)}</span>
        </div>
        <div class="lead-meta">
          ${esc([l.contact_role, l.company_name].filter(Boolean).join(' · '))} · ${fmtDate(l.created_at)}
        </div>
      </div>
      <div class="lead-right">
        <div class="lead-count">${l.candidate_count ?? '—'}</div>
        <div class="lead-count-label">candidatos</div>
      </div>
      <svg class="lead-chevron" id="exp-${esc(l.id)}" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="2,5 7,10 12,5"/>
      </svg>
    </div>
    <div class="lead-body" id="body-${esc(l.id)}">
      <div class="lead-grid">
        <div>
          <div class="detail-label">Contato</div>
          <div class="detail-value">
            <strong>${esc(l.contact_name || '—')}</strong><br>
            ${esc([l.contact_role, l.company_name].filter(Boolean).join(' · ') || '')}<br>
            <a href="mailto:${esc(l.contact_email)}">${esc(l.contact_email || '—')}</a><br>
            ${waLink ? `<a href="${esc(waLink)}" target="_blank" rel="noopener">${esc(l.contact_phone)} ↗</a>` : esc(l.contact_phone || '—')}
          </div>
        </div>
        <div>
          <div class="detail-label">Status</div>
          <select class="status-select" onchange="updateStatus('${esc(l.id)}', this.value)">
            <option value="new"          ${l.status === 'new' ? 'selected' : ''}>Novo</option>
            <option value="contacted"    ${l.status === 'contacted' ? 'selected' : ''}>Contactado</option>
            <option value="converted"    ${l.status === 'converted' ? 'selected' : ''}>Convertido</option>
            <option value="disqualified" ${l.status === 'disqualified' ? 'selected' : ''}>Desqualificado</option>
          </select>
          <div style="margin-top:12px;font-size:12px;color:var(--muted)">Recebido em ${fmtDate(l.created_at)}</div>
        </div>
      </div>

      <hr class="divider">

      <div class="detail-label" style="margin-bottom:12px">Job Description</div>
      <div>
        <div class="tag-list" style="margin-bottom:16px">
          ${jd.titulo_vaga       ? `<span class="tag tag-gold">${esc(jd.titulo_vaga)}</span>` : ''}
          ${jd.nivel_senioridade ? `<span class="tag">${esc(jd.nivel_senioridade)}</span>` : ''}
          ${jd.modelo_trabalho   ? `<span class="tag">${esc(jd.modelo_trabalho)}</span>` : ''}
          ${jd.setor             ? `<span class="tag">${esc(jd.setor)}</span>` : ''}
        </div>
        ${jd.resumo_executivo ? `<div class="jd-section"><div class="jd-title">Resumo Executivo</div><div class="jd-text">${esc(jd.resumo_executivo)}</div></div>` : ''}
        ${jd.contexto_empresa ? `<div class="jd-section"><div class="jd-title">Contexto da Empresa</div><div class="jd-text">${esc(jd.contexto_empresa)}</div></div>` : ''}
        ${jd.sobre_a_vaga ? `<div class="jd-section"><div class="jd-title">Sobre a Vaga</div><div class="jd-text">${esc(jd.sobre_a_vaga)}</div></div>` : ''}
        ${jd.responsabilidades?.length ? `<div class="jd-section"><div class="jd-title">Responsabilidades</div><div class="tag-list">${tagList(jd.responsabilidades)}</div></div>` : ''}
        ${jd.requisitos_obrigatorios?.length ? `<div class="jd-section"><div class="jd-title">Requisitos Obrigatórios</div><div class="tag-list">${tagList(jd.requisitos_obrigatorios)}</div></div>` : ''}
        ${jd.requisitos_desejaveis?.length ? `<div class="jd-section"><div class="jd-title">Requisitos Desejáveis</div><div class="tag-list">${tagList(jd.requisitos_desejaveis)}</div></div>` : ''}
        ${jd.perfil_comportamental?.length ? `<div class="jd-section"><div class="jd-title">Perfil Comportamental</div><div class="tag-list">${tagList(jd.perfil_comportamental)}</div></div>` : ''}
        ${jd.analise_mercado ? `<div class="jd-section"><div class="jd-title">Análise de Mercado</div><div class="jd-text" style="color:var(--muted-mid)">${esc(jd.analise_mercado)}</div></div>` : ''}
      </div>

      ${l.audio_transcript ? `
        <hr class="divider">
        <div class="detail-label">Transcrição do Áudio</div>
        <div class="transcript-box">"${esc(l.audio_transcript)}"</div>
      ` : ''}
    </div>
  </div>`;
}

function toggleLead(id) {
  const body = document.getElementById('body-' + id);
  const exp  = document.getElementById('exp-' + id);
  const open = body.classList.contains('open');
  body.classList.toggle('open', !open);
  exp.classList.toggle('open', !open);
}

async function updateStatus(id, newStatus) {
  const { error } = await sb.from('candidate_searches').update({ status: newStatus }).eq('id', id);
  if (!error) {
    const lead = allLeads.find(l => l.id === id);
    if (lead) lead.status = newStatus;
    const badge = document.querySelector(`#card-${CSS.escape(id)} .status-badge`);
    if (badge) {
      const labels = { new: 'Novo', contacted: 'Contactado', converted: 'Convertido', disqualified: 'Desqualificado' };
      badge.className = `status-badge status-${newStatus}`;
      badge.textContent = labels[newStatus] || newStatus;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// CONTATOS
// ═══════════════════════════════════════════════════════════
async function loadContacts() {
  const { data, error } = await sb
    .from('contact_leads')
    .select('*')
    .order('created_at', { ascending: false });

  const el = document.getElementById('contacts-list');
  if (error) {
    el.innerHTML = `<div class="loading-center" style="color:#f87171">Erro ao carregar contatos: ${esc(error.message)}</div>`;
    return;
  }
  allContacts = data || [];
  renderContacts(allContacts);
}

function filterContacts() {
  const q      = document.getElementById('contact-search').value.toLowerCase();
  const status = document.getElementById('contact-status-filter').value;
  const filtered = allContacts.filter(c => {
    const matchQ = !q || [c.name, c.company, c.role, c.email].join(' ').toLowerCase().includes(q);
    const matchS = !status || c.status === status;
    return matchQ && matchS;
  });
  renderContacts(filtered);
}

function renderContacts(list) {
  document.getElementById('contacts-count').textContent = `${list.length} contato${list.length !== 1 ? 's' : ''}`;
  const el = document.getElementById('contacts-list');
  if (!list.length) {
    el.innerHTML = '<div class="loading-center" style="color:var(--muted)">Nenhum contato encontrado.</div>';
    return;
  }
  el.innerHTML = list.map(buildContactCard).join('');
}

function buildContactCard(c) {
  const initials = (c.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const statusLabel = { new: 'Novo', contacted: 'Contactado', converted: 'Convertido', disqualified: 'Desqualificado' };
  const waLink = c.phone ? `https://wa.me/55${c.phone.replace(/\D/g, '')}` : null;
  const typeLabels = (c.types || []).map(t => t === 'empresa' ? 'Empresa' : t === 'candidato' ? 'Candidato' : t);

  return `
  <div class="lead-card" id="ccard-${esc(c.id)}">
    <div class="lead-header" onclick="toggleContact('${esc(c.id)}')">
      <div class="lead-avatar">${esc(initials)}</div>
      <div class="lead-info">
        <div class="lead-name">
          ${esc(c.name || 'Sem nome')}
          <span class="status-badge status-${esc(c.status || 'new')}">${esc(statusLabel[c.status] || c.status)}</span>
        </div>
        <div class="lead-meta">
          ${esc([c.role, c.company].filter(Boolean).join(' · ') || c.email)} · ${fmtDate(c.created_at)}
        </div>
      </div>
      <div class="lead-right">
        ${typeLabels.length ? `<div class="lead-count-label">${esc(typeLabels.join(' · '))}</div>` : ''}
      </div>
      <svg class="lead-chevron" id="cexp-${esc(c.id)}" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="2,5 7,10 12,5"/>
      </svg>
    </div>
    <div class="lead-body" id="cbody-${esc(c.id)}">
      <div class="lead-grid">
        <div>
          <div class="detail-label">Contato</div>
          <div class="detail-value">
            <strong>${esc(c.name || '—')}</strong><br>
            ${esc([c.role, c.company].filter(Boolean).join(' · ') || '')}<br>
            <a href="mailto:${esc(c.email)}">${esc(c.email || '—')}</a><br>
            ${waLink ? `<a href="${esc(waLink)}" target="_blank" rel="noopener">${esc(c.phone)} ↗</a>` : esc(c.phone || '—')}<br>
            ${c.country ? `<span style="color:var(--muted)">País: ${esc(c.country)}</span>` : ''}
          </div>
        </div>
        <div>
          <div class="detail-label">Status</div>
          <select class="status-select" onchange="updateContactStatus('${esc(c.id)}', this.value)">
            <option value="new"          ${c.status === 'new' ? 'selected' : ''}>Novo</option>
            <option value="contacted"    ${c.status === 'contacted' ? 'selected' : ''}>Contactado</option>
            <option value="converted"    ${c.status === 'converted' ? 'selected' : ''}>Convertido</option>
            <option value="disqualified" ${c.status === 'disqualified' ? 'selected' : ''}>Desqualificado</option>
          </select>
          <div style="margin-top:12px;font-size:12px;color:var(--muted)">
            Interesse: ${esc(typeLabels.join(' · ') || '—')}<br>
            Origem: ${esc(c.source_page || '—')}<br>
            Recebido em ${fmtDate(c.created_at)}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function toggleContact(id) {
  const body = document.getElementById('cbody-' + id);
  const exp  = document.getElementById('cexp-' + id);
  const open = body.classList.contains('open');
  body.classList.toggle('open', !open);
  exp.classList.toggle('open', !open);
}

async function updateContactStatus(id, newStatus) {
  const { error } = await sb.from('contact_leads').update({ status: newStatus }).eq('id', id);
  if (!error) {
    const c = allContacts.find(x => x.id === id);
    if (c) c.status = newStatus;
    const badge = document.querySelector(`#ccard-${CSS.escape(id)} .status-badge`);
    if (badge) {
      const labels = { new: 'Novo', contacted: 'Contactado', converted: 'Convertido', disqualified: 'Desqualificado' };
      badge.className = `status-badge status-${newStatus}`;
      badge.textContent = labels[newStatus] || newStatus;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Expor globalmente
window.esc = esc;
window.fmtDate = fmtDate;
window.switchTab = switchTab;
window.toggleLead = toggleLead;
window.updateStatus = updateStatus;
window.toggleContact = toggleContact;
window.updateContactStatus = updateContactStatus;

// ═══════════════════════════════════════════════════════════
// EVENT WIRING
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-login')?.addEventListener('click', doLogin);
  document.getElementById('btn-logout')?.addEventListener('click', doLogout);

  document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });

  document.getElementById('lead-search')?.addEventListener('input', filterLeads);
  document.getElementById('status-filter')?.addEventListener('change', filterLeads);
  document.getElementById('contact-search')?.addEventListener('input', filterContacts);
  document.getElementById('contact-status-filter')?.addEventListener('change', filterContacts);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin();
  });

  init();
});
