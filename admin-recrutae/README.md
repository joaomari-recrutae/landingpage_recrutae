# Recrutaê — Admin Panel

Painel administrativo separado do site público. Roda em domínio próprio (ex: `admin.recrutae.com.br`) para maior segurança.

## O que tem aqui

- **Analytics** — visitas, cliques em CTA, wizards iniciados/completos, gráficos de origem e páginas
- **Leads** — formulários enviados pelo wizard de busca de candidatos (do site público)
- **Contatos** — mensagens enviadas pelo formulário "Entre em contato"
- **Blog** — CRUD completo (criar, editar, publicar, excluir posts) com:
  - Editor rich-text (negrito, itálico, sublinhado, títulos, listas, links, imagens)
  - Upload direto de imagens (Supabase Storage) ou URL externa
  - Foto do autor
  - Capa do post
  - Slug automático (SEO-friendly)
  - Publicação e rascunhos

## Estrutura

```
admin-recrutae/
├── index.html         # SPA (login + dashboard)
├── style.css          # Design system dark
├── app.js             # Auth, tabs, analytics, leads, contatos
├── blog-admin.js      # CRUD + editor rich-text (Quill)
├── setup-blog.sql     # Schema da tabela blog_posts + bucket
├── setup-blog.js      # Rodar UMA vez para criar tabela + migrar posts
├── vercel.json        # Config Vercel + headers de segurança
├── README.md          # Este arquivo
└── assets/
    ├── logo.png
    └── favicon-square.png
```

## 1º passo — Setup do banco (rodar apenas 1 vez)

Do diretório raiz do projeto (onde está `.env` com `SUPABASE_ACCESS_TOKEN`):

```bash
node admin-recrutae/setup-blog.js
```

Isso vai:
1. Criar a tabela `blog_posts` no Supabase
2. Criar o bucket público `blog-images` no Supabase Storage
3. Aplicar as policies de segurança (anon lê publicados, authenticated escreve)
4. Migrar os 8 posts atuais do `blog-data.js` para o banco

Se preferir manual, execute `setup-blog.sql` no [SQL Editor do Supabase](https://supabase.com/dashboard/project/niqouquemmtaokciaxpn/sql/new).

## 2º passo — Deploy no Vercel (novo domínio)

### Opção A — Novo projeto no Vercel apontando pra subpasta

1. No dashboard do Vercel, crie um **novo projeto** ligado ao mesmo repo
2. Em **Root Directory**, escolha `admin-recrutae`
3. Deploy — vai pegar o `vercel.json` de dentro da pasta
4. Adicione o domínio `admin.recrutae.com.br` (Settings → Domains)

### Opção B — Repositório separado

1. Copie a pasta `admin-recrutae/` para um repo novo
2. Faça deploy no Vercel apontando pra raiz
3. Adicione o domínio

## 3º passo — Configurar usuário admin

Se ainda não existe um usuário admin (o mesmo que usa o `painel-recrutae-privado-v4.html`):

1. Acesse: https://supabase.com/dashboard/project/niqouquemmtaokciaxpn/auth/users
2. Clique em **Invite user** ou **Add user**
3. Preencha email e senha
4. Faça login em `admin.recrutae.com.br` com essas credenciais

Já existe? Use o mesmo login do painel atual.

## 4º passo — Site público (integração automática)

Os arquivos `blog.html` e `blog-post.html` do site público foram atualizados para **carregar posts do Supabase automaticamente**. Se o Supabase estiver disponível, os posts do banco aparecem. Se não estiver, o site cai para os posts estáticos do `blog-data.js` (fallback).

Não precisa fazer nada — só publicar o novo post no admin.

## Segurança

- ✅ RLS (Row Level Security) no Supabase — anon só vê posts publicados
- ✅ Autenticação obrigatória para escrever/editar/deletar
- ✅ HTML sanitizado com DOMPurify antes de salvar E antes de renderizar
- ✅ Headers de segurança: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- ✅ `noindex, nofollow` em todas as páginas — não aparece no Google
- ✅ Storage bucket com policies (anon lê, authenticated escreve)

## Como usar (dia a dia)

### Criar novo post

1. Login → aba **Blog** → botão **Novo post**
2. Preencha título → slug é gerado automaticamente
3. Escreva no editor (barra: negrito, itálico, sublinhado, títulos H2/H3, listas, links)
4. Ajuste a coluna direita: tag, tempo de leitura (calc. automático), data, capa, autor
5. **Publicar** — vai para o site público. Ou **Salvar rascunho**.

### Editar post existente

1. Aba **Blog** → clica no post
2. Edita o que precisar → **Publicar** salva as mudanças

### Excluir

1. Aba **Blog** → botão **Excluir** no card (ou dentro do editor)

## Troubleshooting

**"Erro ao carregar posts"** — Rode `node admin-recrutae/setup-blog.js` para criar a tabela.

**Login falha** — Verifique se o usuário existe no Supabase Auth ([dashboard](https://supabase.com/dashboard/project/niqouquemmtaokciaxpn/auth/users)).

**Upload de imagem falha** — Verifique se o bucket `blog-images` existe e é público. O script `setup-blog.js` cria automaticamente.

**Post não aparece no site público** — Confirme que está com "Publicado" marcado (não rascunho). Faça hard refresh (Ctrl+Shift+R).
