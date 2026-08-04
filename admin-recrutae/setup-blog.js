// Recrutaê — Admin: Setup do blog (tabela + bucket + migração dos 8 posts existentes)
// Rode: node admin-recrutae/setup-blog.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir  = dirname(fileURLToPath(import.meta.url));
const __root = join(__dir, '..');

const env = Object.fromEntries(
  readFileSync(join(__root, '.env'), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);

const PROJECT_REF  = 'niqouquemmtaokciaxpn';
const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;
const MGMT_BASE    = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const HEADERS      = { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' };

const ok  = s => console.log(`  ✅ ${s}`);
const err = s => console.log(`  ❌ ${s}`);
const log = s => console.log(`  ℹ  ${s}`);

async function runSQL(label, sql, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const r = await fetch(`${MGMT_BASE}/database/query`, {
      method: 'POST', headers: HEADERS, body: JSON.stringify({ query: sql }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (r.ok) { ok(label); return true; }
    const t = await r.text();
    if (t.includes('already exists') || t.includes('duplicate') || t.includes('42710')) {
      ok(`${label} (já existe)`);
      return true;
    }
    if ((t.includes('timeout') || r.status >= 500) && attempt < 3) {
      log(`retry ${attempt + 1}/3 — ${label}`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return runSQL(label, sql, attempt + 1);
    }
    err(`${label} — ${r.status}: ${t.slice(0, 200)}`);
    return false;
  } catch (e) {
    clearTimeout(timer);
    if (attempt < 3) {
      log(`retry ${attempt + 1}/3 — ${label} (${e.message})`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return runSQL(label, sql, attempt + 1);
    }
    err(`${label} — ${e.message}`);
    return false;
  }
}

console.log('\n══════════════════════════════════════════');
console.log('  Recrutaê — Setup Blog Admin');
console.log('══════════════════════════════════════════\n');

if (!ACCESS_TOKEN) {
  err('SUPABASE_ACCESS_TOKEN não configurado no .env');
  process.exit(1);
}

// ── 1. Criar tabela + policies + bucket (blocos separados) ───────────────
console.log('① Criando tabela blog_posts...');
await runSQL('Tabela blog_posts', `
CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  slug         TEXT        NOT NULL UNIQUE,
  title        TEXT        NOT NULL,
  tag          TEXT,
  read_time    TEXT,
  cover_image  TEXT,
  author_name  TEXT        DEFAULT 'Equipe Recrutaê',
  author_photo TEXT,
  excerpt      TEXT,
  content_html TEXT,
  published    BOOLEAN     DEFAULT false
);
`);

await runSQL('Índices blog_posts', `
CREATE INDEX IF NOT EXISTS idx_bp_created   ON blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_slug      ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_bp_published ON blog_posts (published, published_at DESC);
`);

await runSQL('RLS blog_posts', `ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;`);

console.log('\n② Configurando policies...');
await runSQL('Policy anon_read_published', `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'anon_read_published'
  ) THEN
    EXECUTE 'CREATE POLICY anon_read_published ON blog_posts FOR SELECT USING (published = true)';
  END IF;
END $$;
`);

await runSQL('Policy auth_full_access', `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'auth_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY auth_full_access ON blog_posts FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')';
  END IF;
END $$;
`);

await runSQL('Trigger updated_at', `
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_blog_posts_updated_at();
`);

console.log('\n③ Criando bucket blog-images...');
await runSQL('Bucket blog-images', `
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;
`);

await runSQL('Policy blog_images_public_read', `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'blog_images_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY blog_images_public_read ON storage.objects FOR SELECT USING (bucket_id = ''blog-images'')';
  END IF;
END $$;
`);

await runSQL('Policy blog_images_auth_insert', `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'blog_images_auth_insert'
  ) THEN
    EXECUTE 'CREATE POLICY blog_images_auth_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''blog-images'' AND auth.role() = ''authenticated'')';
  END IF;
END $$;
`);

await runSQL('Policy blog_images_auth_update', `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'blog_images_auth_update'
  ) THEN
    EXECUTE 'CREATE POLICY blog_images_auth_update ON storage.objects FOR UPDATE USING (bucket_id = ''blog-images'' AND auth.role() = ''authenticated'')';
  END IF;
END $$;
`);

await runSQL('Policy blog_images_auth_delete', `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'blog_images_auth_delete'
  ) THEN
    EXECUTE 'CREATE POLICY blog_images_auth_delete ON storage.objects FOR DELETE USING (bucket_id = ''blog-images'' AND auth.role() = ''authenticated'')';
  END IF;
END $$;
`);

// ── 2. Migrar posts existentes (blog-data.js) ────────────────────────────
console.log('\n④ Migrando posts existentes de blog-data.js...');

// Parse blog-data.js manualmente (é um objeto literal simples)
const blogDataRaw = readFileSync(join(__root, 'blog-data.js'), 'utf8');
const dataMatch   = blogDataRaw.match(/const blogData\s*=\s*(\{[\s\S]*\});?\s*$/);
if (!dataMatch) {
  err('Não conseguiu parsear blog-data.js');
  process.exit(1);
}

// Avalia o objeto num sandbox mínimo
const blogData = (new Function(`return ${dataMatch[1]}`))();

const monthMap = {
  'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
  'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
  'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
};

const parseDate = (s) => {
  const m = s.toLowerCase().match(/(\d{1,2})\s+de\s+([a-záàãâäéèêëíìîïóòõôöúùûüç]+)\s+de\s+(\d{4})/);
  if (!m) return new Date().toISOString();
  const [, d, mo, y] = m;
  const mm = monthMap[mo] || '01';
  return `${y}-${mm}-${d.padStart(2, '0')}T09:00:00Z`;
};

const escapeSQL = (s) => (s || '').replace(/'/g, "''");

for (const [slug, post] of Object.entries(blogData)) {
  const publishedAt = parseDate(post.date);
  const contentClean = post.content.trim().replace(/\n\s+/g, '\n');
  const excerpt = (post.content.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] || '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, 180);

  const sql = `
    INSERT INTO blog_posts
      (slug, title, tag, read_time, cover_image, author_name, excerpt, content_html, published, published_at, created_at)
    VALUES (
      '${escapeSQL(slug)}',
      '${escapeSQL(post.title)}',
      '${escapeSQL(post.tag)}',
      '${escapeSQL(post.readTime)}',
      '${escapeSQL(post.image)}',
      'Equipe Recrutaê',
      '${escapeSQL(excerpt)}',
      '${escapeSQL(contentClean)}',
      true,
      '${publishedAt}',
      '${publishedAt}'
    )
    ON CONFLICT (slug) DO UPDATE SET
      title        = EXCLUDED.title,
      tag          = EXCLUDED.tag,
      read_time    = EXCLUDED.read_time,
      cover_image  = EXCLUDED.cover_image,
      excerpt      = EXCLUDED.excerpt,
      content_html = EXCLUDED.content_html,
      published    = true,
      published_at = EXCLUDED.published_at;
  `;
  await runSQL(`Post: ${post.title.slice(0, 50)}`, sql);
}

console.log('\n══════════════════════════════════════════');
console.log('  Setup Blog concluído! 🎉');
console.log('══════════════════════════════════════════\n');
console.log(`  ${Object.keys(blogData).length} posts migrados para blog_posts`);
console.log('  Bucket público criado: blog-images');
console.log('\n  Próximo passo:');
console.log('  1. Faça deploy da pasta admin-recrutae/ no Vercel (projeto novo)');
console.log('  2. Configure o domínio (ex: admin.recrutae.com.br)');
console.log('  3. Faça login com o usuário admin existente\n');
