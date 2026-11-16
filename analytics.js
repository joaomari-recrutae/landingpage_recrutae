/* First-party events. Never pass contact fields to this collector. */
(function (root) {
  function createAnalytics(options) {
    const location = options.location;
    const read = key => { try { return options.storage?.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { options.storage?.setItem(key, value); } catch {} };
    const safe = value => String(value || '').replace(/[^\p{L}\p{N}_. /-]/gu, '').slice(0, 100);
    let session = read('rec_session');
    if (!session) { session = globalThis.crypto?.randomUUID?.() || `s${Date.now()}${Math.random().toString(36).slice(2)}`; write('rec_session', session); }
    let attribution;
    try { attribution = JSON.parse(read('rec_attribution') || 'null'); } catch {}
    const query = new URLSearchParams(location.search);
    let referrer = '';
    try { const url = new URL(options.referrer); if (url.origin !== location.origin) referrer = url.hostname; } catch {}
    if (query.has('utm_source') || !attribution) {
      attribution = {
        source: safe(query.get('utm_source')) || referrer || 'direct',
        medium: safe(query.get('utm_medium')) || (referrer ? 'referral' : 'none'),
        campaign: safe(query.get('utm_campaign')), content: safe(query.get('utm_content')), term: safe(query.get('utm_term')),
      };
      write('rec_attribution', JSON.stringify(attribution));
    }
    const page = new URL(location.pathname, location.origin);
    for (const parameter of ['post', 'ind', 'pos']) {
      const value = query.get(parameter);
      if (value && /^[a-z0-9-]{1,160}$/.test(value)) page.searchParams.set(parameter, value);
    }
    async function track(type, meta = {}) {
      try {
        const response = await options.fetch(options.endpoint, {
          method: 'POST', keepalive: true, signal: AbortSignal.timeout(5000),
          headers: { 'Content-Type': 'application/json', apikey: options.key, Authorization: `Bearer ${options.key}`, Prefer: 'return=minimal' },
          body: JSON.stringify({ session_id: session, event_type: type, page: page.pathname + page.search, meta: { ...meta, attribution, referrer } }),
        });
        return response.ok;
      } catch { return false; }
    }
    return {
      track,
      contact: (kind, formId) => track(kind === 'candidate' ? 'candidate_contact' : 'generate_lead', { contact_kind: kind, form_id: formId }),
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createAnalytics };
  else {
    root.RecrutaeAnalytics = { createAnalytics };
    if (root.recrutaeAnalytics) return;
    let storage;
    try { storage = root.sessionStorage; } catch {}
    const tracker = createAnalytics({ endpoint: 'https://niqouquemmtaokciaxpn.supabase.co/rest/v1/analytics_events', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcW91cXVlbW10YW9rY2lheHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTMyNzYsImV4cCI6MjA5NTU2OTI3Nn0.v7j1VxmRIIgxla9MEamhlDyGJNlRLAjC_GYkJyIG3w0', storage, location: new URL(root.location.href), referrer: root.document.referrer, fetch: root.fetch.bind(root) });
    root.recrutaeAnalytics = tracker;
    tracker.track('page_view');
    root.document.addEventListener('click', event => {
      const button = event.target.closest?.('.btn, .btn-cta-nav, .busca-start-btn, .btn-wapp, .ros-button, .nav-link-os');
      if (button) tracker.track('cta_click', { text: (button.getAttribute('aria-label') || button.innerText || button.title || '').trim().slice(0, 60), id: button.id || null });
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
