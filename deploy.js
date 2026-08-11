// Recrutaê — Deploy completo: SQL + Secrets + Edge Function
// Rode após autenticar: node deploy.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync as exec } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, '.env'), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);

const PROJECT_REF   = 'niqouquemmtaokciaxpn';
const ACCESS_TOKEN  = env.SUPABASE_ACCESS_TOKEN;
const MGMT_BASE     = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const MGMT_HEADERS  = {
  'Authorization': `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

const ok  = s => console.log(`  ✅ ${s}`);
const err = s => console.log(`  ❌ ${s}`);
const log = s => console.log(`  ℹ  ${s}`);

console.log('\n══════════════════════════════════════════');
console.log('  Recrutaê — Deploy');
console.log('══════════════════════════════════════════\n');

if (!ACCESS_TOKEN || ACCESS_TOKEN === 'COLE_AQUI_SEU_ACCESS_TOKEN') {
  err('SUPABASE_ACCESS_TOKEN não configurado no .env');
  console.log('\n  → Rode: ! npx supabase login');
  console.log('  → Ou gere em: https://supabase.com/dashboard/account/tokens\n');
  process.exit(1);
}

// ── 1. Criar tabela no banco ───────────────────────────────────────────────
console.log('① Criando tabela candidate_searches...');

const sql = `
CREATE TABLE IF NOT EXISTS candidate_searches (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  contact_name     TEXT        NOT NULL,
  contact_email    TEXT        NOT NULL,
  contact_phone    TEXT,
  contact_role     TEXT,
  company_name     TEXT,
  audio_transcript TEXT,
  text_answers     JSONB,
  job_description  JSONB,
  candidate_count  INTEGER,
  status           TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','converted','disqualified'))
);
CREATE INDEX IF NOT EXISTS idx_cs_created  ON candidate_searches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_status   ON candidate_searches (status);
ALTER TABLE candidate_searches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'candidate_searches' AND policyname = 'edge_function_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY edge_function_full_access ON candidate_searches FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'') WITH CHECK (auth.jwt() ->> ''role'' = ''service_role'')';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS contact_leads (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  phone        TEXT,
  company      TEXT,
  role         TEXT,
  country      TEXT,
  types        TEXT[],
  source_page  TEXT,
  status       TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','converted','disqualified'))
);
CREATE INDEX IF NOT EXISTS idx_cl_created ON contact_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cl_status  ON contact_leads (status);
ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_leads' AND policyname = 'edge_function_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY edge_function_full_access ON contact_leads FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'') WITH CHECK (auth.jwt() ->> ''role'' = ''service_role'')';
  END IF;
END $$;
`;

const sqlResp = await fetch(`${MGMT_BASE}/database/query`, {
  method: 'POST',
  headers: MGMT_HEADERS,
  body: JSON.stringify({ query: sql }),
});

if (sqlResp.ok) {
  ok('Tabela criada com sucesso');
} else {
  const e = await sqlResp.text();
  if (e.includes('already exists')) {
    ok('Tabela já existe — nenhuma alteração necessária');
  } else {
    err(`SQL falhou (${sqlResp.status}): ${e.slice(0, 200)}`);
  }
}

// ── 2. Configurar secrets da Edge Function ────────────────────────────────
console.log('\n② Configurando secrets na Edge Function...');

const secrets = {
  OPENAI_API_KEY:          env.OPENAI_API_KEY,
  RESEND_API_KEY:          env.RESEND_API_KEY,
  RECRUITER_EMAIL:         env.RECRUITER_EMAIL,
  RESEND_FROM_EMAIL:       env.RESEND_FROM_EMAIL,
};

const secretsResp = await fetch(`${MGMT_BASE}/secrets`, {
  method: 'POST',
  headers: MGMT_HEADERS,
  body: JSON.stringify(
    Object.entries(secrets).map(([name, value]) => ({ name, value }))
  ),
});

if (secretsResp.ok || secretsResp.status === 200) {
  ok(`${Object.keys(secrets).length} secrets configurados`);
  Object.keys(secrets).forEach(k => log(k));
} else {
  const e = await secretsResp.text();
  err(`Secrets falhou (${secretsResp.status}): ${e.slice(0, 200)}`);
}

// ── 3. Deploy das Edge Functions via CLI ──────────────────────────────────
console.log('\n③ Fazendo deploy das Edge Functions...');

const FUNCTIONS = ['process-search', 'submit-contact', 'instagram-feed'];

for (const fn of FUNCTIONS) {
  try {
    exec(
      `npx supabase functions deploy ${fn} --project-ref ${PROJECT_REF} --no-verify-jwt`,
      {
        cwd: __dir,
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN },
        encoding: 'utf8',
        timeout: 120000,
      }
    );
    ok(`Edge Function "${fn}" deployada`);
    log(`URL: https://${PROJECT_REF}.supabase.co/functions/v1/${fn}`);
  } catch (e) {
    const msg = e.stdout || e.stderr || String(e);
    if (msg.includes('Deployed Function') || msg.includes('success')) {
      ok(`Edge Function "${fn}" deployada`);
    } else {
      err(`Deploy de "${fn}" falhou: ${msg.slice(0, 300)}`);
    }
  }
}

console.log('\n══════════════════════════════════════════');
console.log('  Deploy concluído!');
console.log('══════════════════════════════════════════\n');
console.log('  Próximos passos:');
console.log('  1. Execute o SQL em: https://supabase.com/dashboard/project/niqouquemmtaokciaxpn/sql/new');
console.log('     (caso a criação automática não tenha funcionado)');
console.log('  2. Abra busca-candidatos.html e teste o wizard completo\n');
