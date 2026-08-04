// ═══════════════════════════════════════════════════════════
// Recrutaê Admin — Blog CRUD + Editor rich-text (Quill)
// ═══════════════════════════════════════════════════════════

const BUCKET_NAME = 'blog-images';

// URL do site público (para preview de imagens relativas + link "Ver")
// Ajuste se o domínio mudar
const PUBLIC_SITE_URL = 'https://recrutae.com.br';

// Resolve URLs relativas (ex: assets/blog/*.svg) para o domínio público
function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${PUBLIC_SITE_URL}/${url.replace(/^\/+/, '')}`;
}

let allPosts       = [];
let currentPostId  = null;
let quill          = null;
let coverImageURL  = '';
let authorPhotoURL = '';

// ═══════════════════════════════════════════════════════════
// INIT QUILL
// ═══════════════════════════════════════════════════════════
function initQuill() {
  if (quill) return;

  const toolbarOptions = [
    [{ 'header': [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['blockquote', 'link', 'image'],
    [{ 'align': [] }],
    ['clean']
  ];

  quill = new Quill('#quill-editor', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: toolbarOptions,
        handlers: {
          image: () => customImageHandler()
        }
      }
    },
    placeholder: 'Escreva o conteúdo do artigo aqui…'
  });

  // Atualiza tempo de leitura em tempo real
  quill.on('text-change', () => {
    const words = quill.getText().trim().split(/\s+/).filter(Boolean).length;
    const min = Math.max(1, Math.round(words / 220));
    const hint = document.getElementById('readtime-auto');
    if (hint) hint.textContent = `Calculado automaticamente: ~${min} min de leitura (${words} palavras)`;
    const readtimeInput = document.getElementById('f-readtime');
    if (readtimeInput && !readtimeInput.dataset.userEdited) {
      readtimeInput.value = `${min} min de leitura`;
    }
  });

  // Colar imagem direto (Ctrl+V)
  quill.root.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await insertImageFromFile(file);
      }
    }
  });
}

// Handler customizado — abre file picker e faz upload
function customImageHandler() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (file) await insertImageFromFile(file);
  };
  input.click();
}

async function insertImageFromFile(file) {
  const range = quill.getSelection(true);
  const placeholderIndex = range.index;

  // Insere placeholder
  quill.insertText(placeholderIndex, '⏳ Enviando imagem...', 'italic', true);
  quill.setSelection(placeholderIndex + '⏳ Enviando imagem...'.length);

  try {
    const url = await uploadImage(file, 'inline');
    // Remove placeholder
    quill.deleteText(placeholderIndex, '⏳ Enviando imagem...'.length);
    // Insere a imagem
    quill.insertEmbed(placeholderIndex, 'image', url);
    quill.setSelection(placeholderIndex + 1);
  } catch (e) {
    quill.deleteText(placeholderIndex, '⏳ Enviando imagem...'.length);
    showEditorMsg(`Erro ao enviar imagem: ${e.message}`, 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// UPLOAD DE IMAGEM
// ═══════════════════════════════════════════════════════════
async function uploadImage(file, kind = 'inline') {
  if (!file) throw new Error('Nenhum arquivo selecionado');
  if (file.size > 8 * 1024 * 1024) throw new Error('Imagem maior que 8MB');
  if (!file.type.startsWith('image/')) throw new Error('Arquivo não é imagem');

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().slice(0, 4);
  const filename = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await sb.storage
    .from(BUCKET_NAME)
    .upload(filename, file, { cacheControl: '31536000', upsert: false, contentType: file.type });

  if (error) throw error;

  const { data } = sb.storage.from(BUCKET_NAME).getPublicUrl(filename);
  return data.publicUrl;
}

// ═══════════════════════════════════════════════════════════
// LOAD / LIST POSTS
// ═══════════════════════════════════════════════════════════
async function loadPosts() {
  const listEl = document.getElementById('posts-list');
  listEl.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const { data, error } = await sb
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    listEl.innerHTML = `<div class="loading-center" style="color:#f87171">Erro ao carregar posts: ${esc(error.message)}</div>`;
    return;
  }
  allPosts = data || [];
  renderPosts(allPosts);
}

function filterPosts() {
  const q      = document.getElementById('post-search').value.toLowerCase();
  const status = document.getElementById('post-status-filter').value;
  const filtered = allPosts.filter(p => {
    const matchQ = !q || [p.title, p.tag, p.slug].join(' ').toLowerCase().includes(q);
    const matchS = status === '' || String(p.published) === status;
    return matchQ && matchS;
  });
  renderPosts(filtered);
}

function renderPosts(posts) {
  document.getElementById('posts-count').textContent = `${posts.length} post${posts.length !== 1 ? 's' : ''}`;
  const el = document.getElementById('posts-list');
  if (!posts.length) {
    el.innerHTML = `
      <div class="loading-center" style="color:var(--muted)">
        Nenhum post encontrado.<br>
        <button class="btn-primary" style="margin-top:16px" onclick="document.getElementById('btn-new-post').click()">Criar primeiro post</button>
      </div>`;
    return;
  }
  el.innerHTML = posts.map(buildPostCard).join('');
}

function buildPostCard(p) {
  const cover = resolveMediaUrl(p.cover_image);
  const bg = cover ? `background-image: url('${cover.replace(/'/g, '%27')}');` : '';
  const statusBadge = p.published
    ? `<span class="status-badge status-converted">Publicado</span>`
    : `<span class="status-badge status-draft">Rascunho</span>`;
  const date = p.published_at
    ? new Date(p.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Sem data';
  const publicUrl = `${PUBLIC_SITE_URL}/blog-post.html?post=${encodeURIComponent(p.slug)}`;

  return `
  <div class="post-card" onclick="openPostEditor('${esc(p.id)}')">
    <div class="post-thumb" style="${bg}"></div>
    <div class="post-info">
      <div class="post-title-row">
        <div class="post-title-txt">${esc(p.title)}</div>
        ${statusBadge}
      </div>
      <div class="post-meta">
        ${p.tag ? `<span>🏷 ${esc(p.tag)}</span>` : ''}
        <span>📅 ${esc(date)}</span>
        ${p.read_time ? `<span>⏱ ${esc(p.read_time)}</span>` : ''}
        <span style="color:var(--muted)">/${esc(p.slug)}</span>
      </div>
    </div>
    <div class="post-actions" onclick="event.stopPropagation()">
      ${p.published ? `<a class="post-action-btn" href="${esc(publicUrl)}" target="_blank" rel="noopener">Ver</a>` : ''}
      <button class="post-action-btn" onclick="openPostEditor('${esc(p.id)}')">Editar</button>
      <button class="post-action-btn danger" onclick="deletePost('${esc(p.id)}', '${esc(p.title.replace(/'/g, "\\'"))}')">Excluir</button>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// EDITOR VIEW
// ═══════════════════════════════════════════════════════════
function showPostList() {
  document.getElementById('blog-list-view').style.display = 'block';
  document.getElementById('blog-editor-view').style.display = 'none';
  currentPostId = null;
  loadPosts();
}

function showPostEditor() {
  document.getElementById('blog-list-view').style.display = 'none';
  document.getElementById('blog-editor-view').style.display = 'block';
  window.scrollTo(0, 0);
  initQuill();
}

function newPost() {
  showPostEditor();
  currentPostId = null;
  coverImageURL = '';
  authorPhotoURL = '';

  document.getElementById('editor-title').textContent = 'Novo post';
  document.getElementById('editor-subtitle').textContent = 'Preencha os campos abaixo';
  document.getElementById('btn-delete-post').style.display = 'none';

  document.getElementById('f-title').value = '';
  document.getElementById('f-slug').value  = '';
  document.getElementById('f-excerpt').value = '';
  document.getElementById('f-tag').value = 'Estratégia';
  document.getElementById('f-readtime').value = '';
  document.getElementById('f-readtime').dataset.userEdited = '';
  document.getElementById('f-author').value = 'Equipe Recrutaê';

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('f-published-at').value = now.toISOString().slice(0, 16);

  document.getElementById('cover-preview').style.backgroundImage = '';
  document.getElementById('author-photo-preview').style.backgroundImage = '';
  document.getElementById('f-cover-url').value = '';
  document.getElementById('f-cover-url').style.display = 'none';
  document.getElementById('f-author-url').value = '';
  document.getElementById('f-author-url').style.display = 'none';

  if (quill) quill.setContents([{ insert: '\n' }]);
  document.getElementById('excerpt-count').textContent = '0';
  hideEditorMsg();
}

async function openPostEditor(id) {
  showPostEditor();
  currentPostId = id;

  const { data: p, error } = await sb.from('blog_posts').select('*').eq('id', id).single();
  if (error || !p) {
    showEditorMsg(`Erro ao carregar post: ${error?.message || 'não encontrado'}`, 'error');
    return;
  }

  document.getElementById('editor-title').textContent = 'Editar post';
  document.getElementById('editor-subtitle').textContent = p.title;
  document.getElementById('btn-delete-post').style.display = 'inline-flex';

  document.getElementById('f-title').value = p.title || '';
  document.getElementById('f-slug').value  = p.slug || '';
  document.getElementById('f-excerpt').value = p.excerpt || '';
  document.getElementById('f-tag').value = p.tag || '';
  document.getElementById('f-readtime').value = p.read_time || '';
  document.getElementById('f-readtime').dataset.userEdited = '1';
  document.getElementById('f-author').value = p.author_name || 'Equipe Recrutaê';

  const dt = p.published_at ? new Date(p.published_at) : new Date();
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  document.getElementById('f-published-at').value = dt.toISOString().slice(0, 16);

  coverImageURL  = p.cover_image  || '';
  authorPhotoURL = p.author_photo || '';
  updateCoverPreview();
  updateAuthorPreview();

  document.getElementById('f-cover-url').value = '';
  document.getElementById('f-cover-url').style.display = 'none';
  document.getElementById('f-author-url').value = '';
  document.getElementById('f-author-url').style.display = 'none';

  document.getElementById('excerpt-count').textContent = (p.excerpt || '').length;

  // Carrega conteúdo no Quill (HTML → Delta)
  const clean = DOMPurify.sanitize(p.content_html || '', {
    ALLOWED_TAGS: ['p', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'br', 'blockquote', 'img', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style']
  });
  const delta = quill.clipboard.convert({ html: clean });
  quill.setContents(delta, 'silent');

  hideEditorMsg();
}

function updateCoverPreview() {
  const el = document.getElementById('cover-preview');
  const resolved = resolveMediaUrl(coverImageURL);
  el.style.backgroundImage = resolved ? `url('${resolved.replace(/'/g, '%27')}')` : '';
}

function updateAuthorPreview() {
  const el = document.getElementById('author-photo-preview');
  const resolved = resolveMediaUrl(authorPhotoURL);
  el.style.backgroundImage = resolved ? `url('${resolved.replace(/'/g, '%27')}')` : '';
}

// ═══════════════════════════════════════════════════════════
// SLUGIFY
// ═══════════════════════════════════════════════════════════
function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ═══════════════════════════════════════════════════════════
// SAVE / PUBLISH / DELETE
// ═══════════════════════════════════════════════════════════
async function savePost(publish) {
  const title = document.getElementById('f-title').value.trim();
  if (!title) {
    showEditorMsg('Título é obrigatório.', 'error');
    return;
  }

  let slug = document.getElementById('f-slug').value.trim();
  if (!slug) slug = slugify(title);

  const excerpt = document.getElementById('f-excerpt').value.trim();
  const tag     = document.getElementById('f-tag').value.trim() || 'Geral';
  const readTime = document.getElementById('f-readtime').value.trim();
  const author   = document.getElementById('f-author').value.trim() || 'Equipe Recrutaê';
  const publishedAtRaw = document.getElementById('f-published-at').value;
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : new Date().toISOString();

  // Sanitiza HTML do Quill antes de salvar
  const rawHtml = quill.root.innerHTML;
  const contentHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'br', 'blockquote', 'img', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style']
  });

  const payload = {
    title, slug,
    excerpt: excerpt || null,
    tag,
    read_time: readTime || null,
    author_name: author,
    author_photo: authorPhotoURL || null,
    cover_image: coverImageURL || null,
    content_html: contentHtml,
    published: !!publish,
    published_at: publishedAt
  };

  const btnPub = document.getElementById('btn-publish');
  const btnDraft = document.getElementById('btn-save-draft');
  btnPub.disabled = true;
  btnDraft.disabled = true;
  const originalPubText = btnPub.textContent;
  const originalDraftText = btnDraft.textContent;
  btnPub.textContent = 'Salvando...';
  btnDraft.textContent = 'Salvando...';

  try {
    if (currentPostId) {
      const { error } = await sb.from('blog_posts').update(payload).eq('id', currentPostId);
      if (error) throw error;
      showEditorMsg(publish ? '✓ Post publicado com sucesso.' : '✓ Rascunho salvo.', 'success');
    } else {
      const { data, error } = await sb.from('blog_posts').insert(payload).select('id').single();
      if (error) throw error;
      currentPostId = data.id;
      document.getElementById('btn-delete-post').style.display = 'inline-flex';
      document.getElementById('editor-title').textContent = 'Editar post';
      document.getElementById('editor-subtitle').textContent = title;
      showEditorMsg(publish ? '✓ Post criado e publicado.' : '✓ Rascunho criado.', 'success');
    }
  } catch (e) {
    if (String(e.message).includes('duplicate') || String(e.code) === '23505') {
      showEditorMsg('Já existe um post com esse slug. Escolha outro.', 'error');
    } else {
      showEditorMsg(`Erro ao salvar: ${e.message}`, 'error');
    }
  } finally {
    btnPub.disabled = false;
    btnDraft.disabled = false;
    btnPub.textContent = originalPubText;
    btnDraft.textContent = originalDraftText;
  }
}

async function deletePost(id, title) {
  const target = id || currentPostId;
  const nameShown = title || document.getElementById('f-title').value || 'este post';
  if (!confirm(`Tem certeza que quer excluir "${nameShown}"?\nEssa ação não pode ser desfeita.`)) return;

  const { error } = await sb.from('blog_posts').delete().eq('id', target);
  if (error) {
    if (id === currentPostId) showEditorMsg(`Erro ao excluir: ${error.message}`, 'error');
    else alert(`Erro ao excluir: ${error.message}`);
    return;
  }

  if (target === currentPostId) showPostList();
  else loadPosts();
}

// ═══════════════════════════════════════════════════════════
// MSG HELPERS
// ═══════════════════════════════════════════════════════════
function showEditorMsg(text, kind = 'info') {
  const el = document.getElementById('editor-msg');
  el.className = `editor-msg ${kind}`;
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(showEditorMsg._t);
  if (kind === 'success') {
    showEditorMsg._t = setTimeout(hideEditorMsg, 4000);
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideEditorMsg() {
  document.getElementById('editor-msg').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// EXPORTS + WIRING
// ═══════════════════════════════════════════════════════════
window.loadPosts       = loadPosts;
window.showPostList    = showPostList;
window.openPostEditor  = openPostEditor;
window.deletePost      = deletePost;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-new-post')?.addEventListener('click', newPost);
  document.getElementById('btn-back-to-list')?.addEventListener('click', showPostList);
  document.getElementById('btn-save-draft')?.addEventListener('click', () => savePost(false));
  document.getElementById('btn-publish')?.addEventListener('click', () => savePost(true));
  document.getElementById('btn-delete-post')?.addEventListener('click', () => deletePost());

  document.getElementById('post-search')?.addEventListener('input', filterPosts);
  document.getElementById('post-status-filter')?.addEventListener('change', filterPosts);

  // Auto-slug do título
  const titleInput = document.getElementById('f-title');
  const slugInput  = document.getElementById('f-slug');
  titleInput?.addEventListener('input', () => {
    if (!slugInput.dataset.userEdited) {
      slugInput.value = slugify(titleInput.value);
    }
  });
  slugInput?.addEventListener('input', () => {
    slugInput.dataset.userEdited = '1';
  });

  document.getElementById('f-readtime')?.addEventListener('input', (e) => {
    e.target.dataset.userEdited = '1';
  });

  // Excerpt counter
  const excerpt = document.getElementById('f-excerpt');
  excerpt?.addEventListener('input', () => {
    document.getElementById('excerpt-count').textContent = excerpt.value.length;
  });

  // Cover: upload
  document.getElementById('btn-cover-upload')?.addEventListener('click', () => {
    document.getElementById('f-cover-file').click();
  });
  document.getElementById('f-cover-file')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const btn = document.getElementById('btn-cover-upload');
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Enviando...';
    try {
      coverImageURL = await uploadImage(file, 'cover');
      updateCoverPreview();
      showEditorMsg('✓ Capa enviada.', 'success');
    } catch (err) {
      showEditorMsg(`Erro ao enviar capa: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
      e.target.value = '';
    }
  });

  // Cover: URL
  document.getElementById('btn-cover-url')?.addEventListener('click', () => {
    const input = document.getElementById('f-cover-url');
    input.style.display = input.style.display === 'none' ? 'block' : 'none';
    if (input.style.display === 'block') input.focus();
  });
  document.getElementById('f-cover-url')?.addEventListener('input', (e) => {
    coverImageURL = e.target.value.trim();
    updateCoverPreview();
  });

  // Author: upload
  document.getElementById('btn-author-upload')?.addEventListener('click', () => {
    document.getElementById('f-author-file').click();
  });
  document.getElementById('f-author-file')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const btn = document.getElementById('btn-author-upload');
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Enviando...';
    try {
      authorPhotoURL = await uploadImage(file, 'author');
      updateAuthorPreview();
      showEditorMsg('✓ Foto do autor enviada.', 'success');
    } catch (err) {
      showEditorMsg(`Erro ao enviar foto: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
      e.target.value = '';
    }
  });

  // Author: URL
  document.getElementById('btn-author-url')?.addEventListener('click', () => {
    const input = document.getElementById('f-author-url');
    input.style.display = input.style.display === 'none' ? 'block' : 'none';
    if (input.style.display === 'block') input.focus();
  });
  document.getElementById('f-author-url')?.addEventListener('input', (e) => {
    authorPhotoURL = e.target.value.trim();
    updateAuthorPreview();
  });
});
