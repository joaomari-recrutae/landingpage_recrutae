-- ============================================================
-- Recrutaê — Admin: tabela de blog + bucket de imagens
-- Execute no SQL Editor: supabase.com/dashboard → SQL Editor
-- Ou rode: node admin-recrutae/setup-blog.js
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_bp_created   ON blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_slug      ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_bp_published ON blog_posts (published, published_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Anon (público) pode ler apenas posts publicados
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'anon_read_published'
  ) THEN
    EXECUTE 'CREATE POLICY anon_read_published ON blog_posts FOR SELECT USING (published = true)';
  END IF;
END $$;

-- Admin autenticado pode fazer tudo
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'auth_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY auth_full_access ON blog_posts FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- updated_at automático
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

-- ============================================================
-- Bucket público de imagens (capa + foto de autor + inline)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Todos podem ler (público)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'blog_images_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY blog_images_public_read ON storage.objects FOR SELECT USING (bucket_id = ''blog-images'')';
  END IF;
END $$;

-- Só autenticado pode escrever/deletar
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'blog_images_auth_insert'
  ) THEN
    EXECUTE 'CREATE POLICY blog_images_auth_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''blog-images'' AND auth.role() = ''authenticated'')';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'blog_images_auth_update'
  ) THEN
    EXECUTE 'CREATE POLICY blog_images_auth_update ON storage.objects FOR UPDATE USING (bucket_id = ''blog-images'' AND auth.role() = ''authenticated'')';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'blog_images_auth_delete'
  ) THEN
    EXECUTE 'CREATE POLICY blog_images_auth_delete ON storage.objects FOR DELETE USING (bucket_id = ''blog-images'' AND auth.role() = ''authenticated'')';
  END IF;
END $$;
