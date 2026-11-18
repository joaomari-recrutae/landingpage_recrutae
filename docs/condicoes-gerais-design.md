# Condições gerais de contratação

Pedido: página pública de consulta das condições enviadas pelo advogado, com link no rodapé junto à política de privacidade, identidade Recrutaê, movimento discreto e retorno à landing page. A prévia foi entregue; em 18/11/2026 o usuário autorizou publicar após retirar “Copiar link”, mover o download para o final e melhorar a hero.

Modo: leitura. Visitantes são clientes e representantes que recebem o endereço para consultar as cláusulas. Texto jurídico preservado integralmente do DOCX, incluindo vigência, endereço e prazos; nenhuma revisão ou interpretação jurídica.

## Direction contract

THESIS: documento de consulta, com texto completo e navegação direta entre as doze seções.

OWN-WORLD: extensão da política de privacidade existente; roxo Recrutaê, creme, amarelo, Bricolage Grotesque e DM Sans locais. Sem imagens decorativas ou mudança no sistema visual.

STORY: reconhecer a Recrutaê, identificar o documento e a vigência, localizar uma cláusula, baixar ou imprimir o documento no final e voltar ao site.

FIRST VIEWPORT: cabeçalho claro com logo e retorno; título amplo centralizado sobre roxo, Contratação em amarelo, introdução curta e vigência original. Hero sem botões; leitura em creme com índice lateral. No celular, índice recolhível acima do texto. Download PDF direto e impressão ficam depois da última cláusula.

FORM: extensão precisa de uma página de leitura existente, sem sorteio de conceitos. Movimento de entrada único, discreto; linha de leitura e indicação da seção atual. Texto visível sem scripts e preferência de movimento reduzido respeitada.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Integridade e limites

- Fonte: DOCX fornecido, SHA-256 registrado em `data/contract-terms.json`. Não tem revisões pendentes nem tabelas; títulos e parágrafos numerados mantidos.
- Conferir o texto renderizado com todos os parágrafos da fonte, incluindo cláusulas 4.3–4.7 (estilo de título no Word, mas subcláusulas no conteúdo).
- Endereço na fonte: Rua Conceição de Monte Alegre, 198, conjunto 91; site atual: Rua Castilho, 392, conjunto 101. Preservar e apontar ao usuário.
- Cláusula 3.2 prevê prazo da Proposta ou, na falta, até 7 dias úteis; marketing atual menciona até 5 dias úteis para primeira shortlist. Preservar e apontar ao usuário.
- Link estável: `/condicoes-gerais-de-contratacao`. Publicação autorizada pelo usuário em 18/11/2026 com os ajustes acima.

## Resultado da revisão

Modo **Read**: extensão do sistema existente, com os mesmos tokens, fontes locais e logos; sem desvio da identidade registrada em `DESIGN.md`. A hero centralizada apresenta introdução curta e vigência, sem botão de copiar. O índice contextual acompanha a leitura; o PDF estático para download e a impressão ficam depois da última cláusula, junto ao retorno ao site. A fonte jurídica, seus 67 parágrafos e as 12 seções foram preservados, assim como `DESIGN.md`.

Os 35 testes Node e a verificação de navegador em 1440, 390 e 320 px passaram, incluindo o download real do PDF. O coordenador renderizou e inspecionou as cinco páginas do PDF final; a extração comparou todos os 67 parágrafos, em ordem, à fonte. Uma nova revisão independente marcou **Ship**, sem achados materiais nos ajustes.

As capturas atuais estão em `C:/Users/joaol/Downloads/Recrutae-condicoes-final-2026-11-18`. A publicação está autorizada pelo usuário e será conferida na Vercel.
