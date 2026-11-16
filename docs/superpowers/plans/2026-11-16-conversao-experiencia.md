# Melhorias de conversão, conteúdo e experiência

**Pedido autorizado:** executar os seis pontos sugeridos em ordem, corrigir fontes e carregamentos e criar por último uma 404 própria da Recrutaê. Sem pausa para decisões de rotina.

**Arquitetura:** manter HTML/CSS/JS e Vercel. Renderizar os templates no servidor com dados públicos, conteúdo CMS saneado e fallback estático. Usar o coletor de eventos existente para origem e conversões, sem dados pessoais. Preservar o fluxo de contatos e não adicionar ferramentas pagas ou inventar cases.

## Execução em ordem

- [x] 1. Conteúdo completo no HTML: artigos, indústrias e posições; metadados individuais; timeout e contingência; 404 real para identificadores inválidos. Testes HTTP com JavaScript ausente e CMS disponível/indisponível.
- [x] 2. Conversões e atribuição: registrar envio confirmado, origem/campanha, tipo de contato, falhas e estágio do formulário; não contar clique como envio. Tornar o resultado consultável no painel existente.
- [x] 3. Botões: alinhar o texto ao contato efetivo e informar o próximo passo, mantendo caminhos comerciais/candidatos.
- [x] 4. Provas: reorganizar os logos e relatos existentes, substituir estatísticas sem metodologia por entregáveis verificáveis. Preparar cases reais apenas se houver dados autorizados.
- [x] 5. FAQ comercial com fatos públicos e instruções claras, sem inventar preços/garantias.
- [x] 6. Organization/Article/BreadcrumbList com dados reais, correspondência ao conteúdo e escape seguro.
- [x] 7. Fontes locais com pesos/itálicos reais e licença; estados de carregamento, erro, contingência e movimento reduzido; remover telas que possam prender a navegação.
- [x] 8. 404 memorável, estática, responsiva e acessível; recursos locais com caminhos absolutos; HTTP 404 para caminhos inexistentes e parâmetros inválidos, sem loops.
- [x] Verificação conjunta: testes existentes e novos, desktop/celular, sem JS/fontes bloqueadas, prévia Vercel, revisão independente, publicação e conferência em produção.

## Evidências e decisões

- Base: branch `codex/landing-conversao-experiencia`, a partir da `main` limpa.
- Cases: pesquisa não encontrou evidência suficiente; pergunta assíncrona enviada ao usuário, sem bloquear outros trabalhos.
- A 404 usa humor sobre recrutamento: a página faltou à entrevista. A ação principal volta à home, com caminhos diretos para empresas e candidatos.
- Preservar a tag Google de verificação e as 44 URLs do sitemap.
- Usuário confirmou o prazo da shortlist; pesquisa adicional nas fontes oficiais confirmou até 5 dias úteis. Não foram encontrados cases empresariais completos; o usuário informou que poderá fornecer depois.
- A revisão encontrou e confirmou dois defeitos, corrigidos: `hidden` sobreposto por `display:flex` no resultado sem contagem real; falta de bootstrap do analytics na página do OS.
- Os erros de carregamento não apresentam mais contagens fixas fictícias. O endpoint da busca só confirma sucesso após persistência; uma estimativa da IA não é apresentada como contagem verificada da base.
- O sanitizer atual requer ESM internamente, incompatível com o loader CommonJS da Vercel. O build empacota a versão atual em `.generated/sanitize.cjs`; não foi mantida a versão antiga com alertas do npm audit.
- Configuração explícita de build e output na raiz preserva o site estático na Vercel.

## Resultado

- 33 testes Node aprovados; testes de navegador aprovados para conversões, atribuição, validação, falha/retry/cancelamento da busca, blog dinâmico e paginação, restauração de navegação e os fluxos anteriores de Recrutaê OS/scroll.
- 44 URLs verificadas em prévia e produção com HTTP 200, canonical individual, JSON-LD e conteúdo renderizado no servidor. Verificação Google preservada.
- QA de seis rotas em 1440/390/320px, sem overflow; 404 com e sem scripts/fontes e em caminhos profundos; recuperação para a home confirmada.
- Revisão independente do código e do build sem achados pendentes no escopo; revisão visual 404: Ship nas capturas desktop e celular.
- Busca `process-search` publicada na Supabase, preservando a configuração pública de autenticação existente. OPTIONS 200 e payload inválido 400 verificados sem registrar contatos ou enviar e-mails de teste.
- Prévia final validada: `landingpage-recrutae-j1w4p1brz-recrutae.vercel.app`. Promoção em produção: `dpl_2QzSkvCeD6F6bnoqE91kTY2FmHBU`, estado READY, alias `www.recrutae.com.br`.
- Os cases empresariais dependem dos dados autorizados que o usuário informou que enviará depois. O material de preparação está em `docs/company-cases.md`.
