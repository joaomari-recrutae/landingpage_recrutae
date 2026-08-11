// Recrutaê — Setup Instagram: cria tabela + salva token de longa duração
//
// Como obter o token (uma única vez, leva ~5 min):
//   1. developers.facebook.com/apps → Criar app → tipo "Business"
//   2. No dashboard do app: Adicionar produto "Instagram"
//   3. Menu lateral: Instagram > API setup with Instagram business login
//   4. Siga até "3. Set up Instagram business login" e conecte a conta @recrut.ae
//   5. Clique em "Generate token" ao lado da conta, faça login e copie o token
//      (esse token do App Dashboard já vem de longa duração — 60 dias)
//
// Uso:
//   1. Adicione ao .env: INSTAGRAM_ACCESS_TOKEN=cole_o_token_aqui
//   2. node setup-instagram.js
//   3. Deploy: npx supabase functions deploy instagram-feed --project-ref niqouquemmtaokciaxpn --no-verify-jwt

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, '.env'), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);

const PROJECT_REF   = 'niqouquemmtaokciaxpn';
const ACCESS_TOKEN  = env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL  = env.SUPABASE_URL;
const SERVICE_KEY   = env.SUPABASE_SERVICE_ROLE_KEY;
const IG_TOKEN      = env.INSTAGRAM_ACCESS_TOKEN;
const MGMT_BASE     = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const MGMT_HEADERS  = { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' };

const ok  = s => console.log(`  ✅ ${s}`);
const err = s => console.log(`  ❌ ${s}`);
const log = s => console.log(`  ℹ  ${s}`);

console.log('\n══════════════════════════════════════════');
console.log('  Recrutaê — Setup Instagram Feed');
console.log('══════════════════════════════════════════\n');

if (!ACCESS_TOKEN) {
  err('SUPABASE_ACCESS_TOKEN não configurado no .env');
  process.exit(1);
}
if (!IG_TOKEN) {
  err('INSTAGRAM_ACCESS_TOKEN não configurado no .env');
  console.log('\n  Veja o passo a passo no topo deste arquivo (setup-instagram.js) para obter');
  console.log('  o token de longa duração antes de rodar este script.\n');
  process.exit(1);
}

// ── 1. Criar tabela ────────────────────────────────────────────────────────
console.log('① Criando tabela instagram_settings...');
async function runSQL(label, sql) {
  const r = await fetch(`${MGMT_BASE}/database/query`, {
    method: 'POST', headers: MGMT_HEADERS, body: JSON.stringify({ query: sql }),
  });
  if (r.ok) { ok(label); return true; }
  const t = await r.text();
  if (t.includes('already exists') || t.includes('duplicate')) { ok(`${label} (já existe)`); return true; }
  err(`${label} — ${r.status}: ${t.slice(0, 200)}`);
  return false;
}

await runSQL('Tabela instagram_settings', `
CREATE TABLE IF NOT EXISTS instagram_settings (
  id           INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token TEXT        NOT NULL,
  ig_user_id   TEXT,
  expires_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE instagram_settings ENABLE ROW LEVEL SECURITY;
`);

// ── 2. Validar o token e obter o Instagram User ID (via /me) ─────────────
console.log('\n② Validando token com a API do Instagram...');
const meRes = await fetch(`https://graph.instagram.com/me?fields=user_id,username&access_token=${encodeURIComponent(IG_TOKEN)}`);
if (!meRes.ok) {
  err(`Token inválido ou expirado — ${meRes.status}: ${(await meRes.text()).slice(0, 200)}`);
  process.exit(1);
}
const meRaw = await meRes.json();
// A API pode retornar o objeto direto ou dentro de { data: [...] } — trata os dois casos
const me = Array.isArray(meRaw.data) ? meRaw.data[0] : meRaw;
if (!me?.user_id) {
  err('Resposta inesperada da API — não foi possível obter o user_id. Resposta: ' + JSON.stringify(meRaw).slice(0, 200));
  process.exit(1);
}
ok(`Token válido — conta: @${me.username} (IG_ID: ${me.user_id})`);

// ── 3. Salvar token na tabela (via REST, usando service role) ────────────
console.log('\n③ Salvando token no banco...');
if (!SUPABASE_URL || !SERVICE_KEY) {
  err('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env');
  process.exit(1);
}

const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 dias

const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/instagram_settings`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
  },
  body: JSON.stringify({
    id: 1,
    access_token: IG_TOKEN,
    ig_user_id: me.user_id,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }),
});

if (saveRes.ok) {
  ok('Token salvo com sucesso');
} else {
  err(`Falha ao salvar — ${saveRes.status}: ${(await saveRes.text()).slice(0, 300)}`);
  process.exit(1);
}

console.log('\n══════════════════════════════════════════');
console.log('  Setup concluído! 🎉');
console.log('══════════════════════════════════════════\n');
console.log('  Próximos passos:');
console.log('  1. Deploy da Edge Function: npx supabase functions deploy instagram-feed --project-ref niqouquemmtaokciaxpn --no-verify-jwt');
console.log('  2. Recarregue o site — a seção Instagram vai mostrar os posts reais');
console.log('  3. O token se renova sozinho a cada chamada da função — nada mais a fazer\n');
