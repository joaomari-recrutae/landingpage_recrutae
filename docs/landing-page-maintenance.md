# Operação da landing page

## Desenvolvimento e publicação

Requer Node 24. Execute `npm ci`, `npm run dev` e abra `http://127.0.0.1:4173`. O `predev` prepara a dependência de saneamento de HTML para o mesmo formato usado na Vercel. `npm test` executa o build e os testes Node; `npm run build` prepara as funções para publicação. Não versionar `.generated/`, `node_modules` ou variáveis `.env*`.

As alterações entram em produção pela `main` do repositório conectado a `recrutae/landingpage-recrutae`. Validar primeiro uma prévia com `node scripts/verify-geo-deployment.cjs URL --preview`, usando o login Vercel existente. O usuário também pode executar os testes de navegador `verify-experience.cjs`, `verify-delivery.cjs`, `verify-recrutae-os.cjs`, `verify-scroll-navigation.cjs` e `verify-geo-browser.cjs` com Chromium instalado.

## Contatos e campanhas

No painel existente, em `/admin-login`, a área Analytics mostra **Contatos confirmados**, separando contatos comerciais de candidatos, e a tabela de origem/campanha. Os números representam a amostra dos últimos 500 eventos e não contagens históricas completas.

Para identificar campanhas, use links como `https://www.recrutae.com.br/?utm_source=google&utm_medium=cpc&utm_campaign=recrutamento-ti`. A origem acompanha a navegação na mesma aba. Os eventos não incluem nome, e-mail, telefone nem respostas dos formulários.

Eventos: `page_view`, `cta_click`, `form_start`, `form_validation_error`, `form_error`, `generate_lead`, `candidate_contact`, `wizard_start`, `wizard_submit`, `wizard_complete` e `wizard_error`. O evento de contato é disparado apenas após confirmação do endpoint; falha HTTP ou resposta sem sucesso não gera conversão. Cliques são medidos separadamente.

## Conteúdo e busca

Artigos, indústrias e posições chegam completos no HTML. O blog consulta somente posts publicados, limita a espera e preserva o conteúdo estático ou a última cópia pública se o CMS falhar. Para um artigo desconhecido, indisponibilidade temporária do CMS responde 503; inexistência confirmada responde 404.

`blog-data.js` é o conteúdo estático de contingência; os catálogos estão em `data/industries.json`, `data/positions.json` e `data/position-aliases.json`. Novas páginas/artigos também precisam entrar no sitemap. Os dados institucionais ficam em `data/organization.json`: após alterar, execute `npm run metadata` e publique as páginas atualizadas.

O resultado da busca gratuita não deve afirmar quantidade real de candidatos a partir de uma estimativa da IA. Sem uma contagem verificada da base, a interface confirma o recebimento do briefing e encaminha o contato ao consultor.

## Fontes, FAQ, provas e 404

Fontes originais locais em `assets/fonts/`, com licenças e proveniência, declaradas em `fonts.css`. Evitar reintroduzir imports remotos duplicados ou pesos que não foram carregados.

A FAQ usa fatos dos serviços e o prazo de shortlist confirmado pelo usuário. Os relatos publicados são de candidatos; as empresas exibidas são clientes da consultoria. Não há case empresarial detalhado aprovado; consulte `docs/company-cases.md` antes de preencher `data/company-cases.json` e publicar novos relatos.

A 404 é estática e não depende de JavaScript, CMS ou API. Seus recursos e links usam caminhos a partir de `/`, inclusive quando solicitada em pastas profundas. A Vercel serve `404.html` automaticamente para caminhos não encontrados, e os templates inválidos usam o mesmo documento com status 404.
