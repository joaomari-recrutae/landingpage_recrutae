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

- [ ] Criar `recrutae-os.html`, `recrutae-os.css`, `recrutae-os.js` e copiar marcas públicas.
- [ ] Integrar destaque na home e link OS nos menus desktop/mobile e rodapés.
- [ ] Validar abas por clique e teclado, personalização visual, mudança de etapa e contagens, FAQ e CTAs.
- [ ] Validar desktop, tablet e celular; sem JavaScript e com movimento reduzido; links e assets locais.
- [ ] Revisar capturas reais, erros de execução e diff. Entregar prévia para revisão.
