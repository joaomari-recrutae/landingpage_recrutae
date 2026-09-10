# Recrutaê OS — página de produto

**Objetivo:** apresentar o OS no site institucional, com página própria, chamada na home e navegação desktop/mobile.

**Implementação:** HTML estático, CSS delimitado por `.ros-page` e JavaScript progressivo. Sem dependências de execução novas. Conteúdo e CTAs legíveis sem JavaScript. Demonstração com dados fictícios, sem conexão com o portal privado.

## Direção visual

Creme `#F5F0E8` e Bricolage Grotesque/DM Sans do institucional; navy `#1F1E42`, tinta `#0B0A18` e âmbar `#FBB900` do OS. Cabeçalho institucional claro, abertura navy com uma candidatura atravessando a página da empresa e o painel; demonstração ampla sobre superfície clara; fechamento navy. Tipografia de títulos 40–72px; corpo 16–19px. O elemento principal é o produto demonstrado em HTML, com boa leitura e controles acessíveis.

## Evidências do produto

Fonte local consultada: `C:/Users/joaol/Documents/Recrutae/Portal Recrutae/recrutaeportal_priv`.

- `PRODUCT.md` e `docs/ESTADO-ATUAL.md` descrevem versões anteriores. O código atual e os componentes atuais prevalecem em caso de divergência.
- Página de carreiras e personalização: `app/[client]/(site)`, `components/public`, `lib/clients`.
- Formulários, currículos, etapas e banco de talentos: `lib/jobs`, `lib/applications`, `lib/talents`, `components/candidates`.
- Etapas iniciais: `lib/jobs/etapas.ts`: Inscrito, Triagem, Entrevista, Proposta, Contratado.
- Triagem: `lib/ia/score-do-formulario.ts` e `gerar-score-do-formulario.ts`.
- Entrevistas, transcrição e relatório: `lib/interviews`, `lib/ia/relatorio-da-entrevista.ts`, `components/cliente/relatorio-da-entrevista.tsx`. A avaliação é apoio à decisão humana.
- Comunicações: `lib/email`; WhatsApp depende de configuração, portanto não anunciar disponibilidade universal.
- Planos: `lib/pagamentos/planos.ts`, `components/landing/entregaveis.tsx`. Standard é a base; Sourcing adiciona busca ativa; Fullservice adiciona consultoria ponta a ponta. Não duplicar preços nem anunciar métricas de resultado.
- Contato comercial: `lib/contato.ts`, WhatsApp `5511979796154`.
- Marcas copiadas somente de `public/brand`; nenhum dado de cliente, credencial ou documento privado será publicado.

## Referências e prompts do design

- https://21st.dev/@serafimcloud/components/hero-with-mockup — apresentação do produto junto da promessa e CTA.
- https://21st.dev/blog/react-bento-grid-components — áreas diferentes conforme a importância e o conteúdo.
- https://21st.dev/blog/prompts-for-ui-generation — especificar conteúdo, tokens e restrições antes do componente.
- https://21st.dev/blog/landing-page-sections — demonstração e uma ação comercial consistente.

Adaptação original em HTML/CSS, sem instalar/copiar componentes React. Brief aplicado: “Apresente uma página de carreiras com a marca da empresa e um painel de contratação. Use as cores e fontes existentes. Mostre três visões navegáveis com dados explicitamente fictícios; preserve conteúdo sem JavaScript, foco visível, movimento reduzido e largura mínima de 320px. A ação comercial é agendar demonstração no WhatsApp. Não invente clientes, depoimentos nem resultados.”

## Execução e verificação

- [x] Criar `recrutae-os.html`, `recrutae-os.css`, `recrutae-os.js` e copiar marcas públicas.
- [x] Integrar destaque na home e link OS nos menus desktop/mobile e rodapés.
- [x] Validar abas por clique e teclado, personalização visual, mudança de etapa e contagens, FAQ e CTAs.
- [x] Validar desktop, tablet e celular; sem JavaScript e com movimento reduzido; links e assets locais.
- [x] Revisar capturas reais, erros de execução e diff. Entregar prévia para revisão.

## Ajuste pedido durante a execução

Em 10/09, o usuário pediu mais detalhes e cores da landing do OS e uma aba no site principal. A demonstração ganhou fundo tinta, abas âmbar e seção sobre transcrição, evidências de confiabilidade e histórico. A entrada OS foi adicionada a nove menus desktop, ao menu móvel compartilhado e aos rodapés, além do destaque logo após a abertura da home.

O usuário também definiu as marcas: `assets/recrutae-os/recrutae-os-lockup-navy.png` para a assinatura completa e `assets/recrutae-os/recrutae-ros.png` para a versão compacta. Abertura, destaques e menu institucional usam a marca completa; o menu usa tratamento monocromático navy e hover dourado discreto. O cabeçalho OS e a miniatura do painel usam a compacta. O fechamento escuro usa recrutae-ros-navy.png, e o rodapé usa a marca oficial Recrutaê.

## Validação

- `scripts/verify-recrutae-os.cjs`: interações, links para painéis, cinco larguras nas três abas, recursos locais, conteúdo sem JavaScript, movimento reduzido e navegação da home desktop/mobile.
- Playwright/Chromium: capturas revisadas de abertura, demonstração, quadro e home; nenhuma rolagem horizontal na página; o quadro tem sua própria região rolável identificada.
- axe-core: verificação WCAG A/AA nas três abas em 1440px e 390px; textos secundários ajustados a partir da medição de contraste.
- Revisão independente de código: nenhum defeito funcional identificado.
- `node --check` nos scripts alterados e `git diff --check`.

Prévia local: `/recrutae-os.html`; entrada na home: `/index.html#recrutae-os`. Commit e push autorizados pelo usuário após a aprovação visual.


## Refinamentos aprovados

- Cabeçalho OS simplificado com retorno ao site principal e links externos para recrutaeos.com.br.
- Fundo contínuo na abertura e destaque OS da home; degradê navy, violeta e dourado na abertura OS.
- Navegação suave compartilhada nas 11 páginas públicas, incluindo menus móveis e links entre páginas.
- Animações preservadas com movimento reduzido por solicitação expressa do usuário; entradas acionadas apenas ao chegar à área visível.
- Brilho dourado que acompanha o mouse nos três planos.
- scripts/verify-scroll-navigation.cjs verifica navegação, movimento reduzido e animações de entrada.
