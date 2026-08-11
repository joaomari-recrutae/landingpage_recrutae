-- ============================================================
-- Recrutaê — Supabase: Instagram feed (token storage)
-- Execute no SQL Editor ou rode: node setup-instagram.js
-- ============================================================

-- Linha única (singleton) com o token de acesso e sua validade.
-- Nunca exposta ao público — só a Edge Function (service_role) le/escreve.
CREATE TABLE IF NOT EXISTS instagram_settings (
  id           INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token TEXT        NOT NULL,
  ig_user_id   TEXT,
  expires_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE instagram_settings ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy para anon/authenticated de propósito — só service_role
-- (usado internamente pela Edge Function e pelo script de setup) acessa esta tabela.
