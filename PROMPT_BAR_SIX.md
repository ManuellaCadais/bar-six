# Prompt — Sistema de Pedidos via QR Code para o Bar da SIX

Copie tudo abaixo da linha e cole no Claude Code (ou outro agente de código), com os arquivos `Foto_drinks.jpeg`, `Video_drinks.mp4` e `Cardapio.jpeg` na pasta do projeto.

---

## Papel

Você é um engenheiro full-stack sênior com forte olho para design. Sua missão é construir, do zero até o deploy, um sistema de pedidos via QR Code para o bar de uma academia de luxo. Entregue código de produção, não protótipo.

## Contexto

A SIX Sport Life é uma academia de luxo que possui um bar de bebidas proteicas, pré-treinos, cafés e drinks — o bar assina como "SIX Wowness Club" no cardápio físico e usa os perfis @sixhealth.br e @sixwownessbar. Hoje o aluno precisa ir fisicamente ao balcão para pedir. Queremos espalhar QR Codes nos tablets e pontos da academia para que o aluno escaneie com o próprio celular, veja o cardápio, monte o pedido e envie — e o time do bar receba os pedidos em tempo real numa tela no balcão.

## Objetivo

Uma aplicação web responsiva (mobile-first) com três áreas:

1. **Cardápio do aluno** (`/`) — aberto via QR Code, sem login.
2. **Painel do bar** (`/bar`) — fila de pedidos em tempo real, protegida por PIN simples.
3. **Admin do cardápio** (`/admin`) — CRUD de categorias e itens, protegido por PIN.

Mais uma página utilitária:

4. **Gerador de QR Code** (`/qr`) — renderiza o QR da URL de produção em versão para impressão (QR preto sobre fundo creme, com o nome SIX), com botão de download em PNG e SVG.

## Fluxo do pedido

1. Aluno escaneia o QR → abre o cardápio no celular.
2. Navega por categorias, toca num item, escolhe personalizações (ex.: sabor do xarope Monin, sabor do Ultracoffee, base água ou leite), define quantidade e adiciona ao carrinho.
3. No carrinho, informa: **nome** (obrigatório), **onde está na academia** (dropdown obrigatório: Musculação, Cardio, Área de Lutas, Studio, Recepção — lista configurável no admin) e **observações** (opcional).
4. Envia o pedido → cai na hora no painel do bar (realtime, sem refresh manual) com **alerta sonoro**.
5. Aluno fica numa tela de acompanhamento (`/pedido/[id]`) que atualiza sozinha: **Recebido → Em preparo → Pronto → Entregue**. Quando ficar "Pronto", a tela muda de forma bem visível (cor + vibração se suportado).
6. Bar avança o status com um toque. Pode cancelar com motivo (aparece para o aluno).

## Regras de negócio

- **Sem pagamento online na v1.** O pedido vai para a comanda/conta do aluno e é acertado no balcão. Deixe o modelo de dados preparado para pagamento futuro (campo de status de pagamento), mas nenhuma UI de pagamento.
- **Sem cadastro/login para o aluno.** Fricção zero: nome + local bastam.
- Item pode ser marcado **indisponível** no admin ou direto no painel do bar (some do cardápio na hora, sem deploy).
- Toggle **"Bar aberto/fechado"** no painel do bar. Fechado, o cardápio continua visível mas mostra aviso elegante e bloqueia envio (com horário de funcionamento configurável no admin).
- **Categorias podem ter dias de disponibilidade.** A categoria "Divirta-se" (bebidas alcoólicas) só aparece e aceita pedidos de sexta a domingo; nos demais dias exibe-se recolhida com a nota "disponível sexta, sábado, domingo e feriados". Para feriados, um botão "Liberar Divirta-se hoje" no painel do bar ativa a categoria manualmente até o fim do dia.
- Itens alcoólicos levam tag discreta **"+18"** e o carrinho com item alcoólico mostra a nota "venda e consumo permitidos apenas para maiores de 18 anos".
- Fila do bar ordenada por chegada, mostrando **tempo decorrido** desde o envio (fica vermelho após X minutos, configurável).
- Pedidos "Entregue"/"Cancelado" saem da fila principal e ficam num histórico do dia com contadores simples (total de pedidos, itens mais vendidos).
- Tudo em **português do Brasil**. Preço é opcional por item (o cardápio físico da SIX não exibe preços): sem preço cadastrado, nenhuma menção a valor aparece na UI; com preço, exibe em R$.

## Cardápio (real — transcrito do cardápio físico, ver `Cardapio.jpeg`)

**O cardápio físico não exibe preços — respeite isso.** Preço é campo opcional por item: sem preço cadastrado, a UI não mostra nenhum valor nem total no carrinho; se um preço for preenchido no admin, aparece em R$. Nunca invente valores.

Cadastre estas categorias e itens como dados iniciais (seed) no banco, nesta ordem, tudo editável no admin:

### Cafés
| Item | Descrição | Personalizações |
|---|---|---|
| Espresso 3 Corações | Dark Roast, Chapada Diamantina | — |
| Macchiato | Espresso com leite | — |
| Hot Latte | Espresso com leite e xarope Monin | Xarope (escolha única): Avelã, Coco ou Cookies |
| Ice Latte | Espresso com leite, gelo e xarope Monin | Xarope (escolha única): Avelã, Coco ou Cookies |

### Pré-Treino
| Item | Descrição | Personalizações |
|---|---|---|
| Hot Shot Ultracoffee | Ultracoffee quente | Sabor (única): Caramelo, Baunilha, Chocolate ou Double Shot · Base (única): Água ou Leite |
| Ice Shot Ultra Coffee | Ultracoffee gelado | Sabor (única): Caramelo, Baunilha, Chocolate ou Double Shot · Base (única): Água ou Leite |
| Ice Shot Nitro 400 | Nitro com água gelada | — |
| Ice Nitro SIX | Nitro com Jungle | Adicional opcional: Xarope Monin |

### Hidrate-se
| Item | Descrição | Personalizações |
|---|---|---|
| Jungle com Monin | Batido com gelo e xarope Monin linha PURE | Sabor do xarope PURE (única; ex.: Frutas Vermelhas) |
| Jungle com Colágeno | Batido com gelo e colágeno | — |
| Ice Tea | Chá gelado | Sabor (única): Hibisco · Maçã · Limão e Gengibre · Maçã com Cranberry |

### Drinks Six Health — seção assinatura, destaque visual no topo
| Item | Descrição | Personalizações |
|---|---|---|
| Pré-treino Six Health | Café espresso, whey, espuma de leite e canela. Uma combinação inteligente para ativar corpo e mente antes do treino. | — |
| Pós-treino Six Health | Whey, creatina, glutamina, colágeno, iogurte, gelo e Monin de morango. Pensado para acelerar a recuperação e nutrir o corpo de forma estratégica. | — |

### Pós-Treino
| Item | Descrição | Personalizações |
|---|---|---|
| Protein SIX | Proteína, Jungle, Monin e gelo | Sabor do xarope Monin (única) |
| Protein Vegano | Proteína vegana e gelo | Base (única): Leite ou Água |
| Vitamina | Iogurte com whey vegano | — |
| Whey Power Daily | A escolha perfeita para seu dia a dia! Whey com banana e mel. Ideal para café da manhã, lanche, pré ou pós-treino. | Base (única): Água ou Leite |

### Divirta-se — disponível somente sexta, sábado, domingo e feriados (regra abaixo)
| Item | Descrição | Personalizações |
|---|---|---|
| Cerveja | Long neck gelada | Versão (única): Heineken ou Heineken Zero |
| Vinho do Dia | Consulte o rótulo do dia no balcão | — |
| Bellini Pêssego | Com xarope Monin de pêssego | — |
| Bellini Morango | Com xarope Monin de morango | — |
| Ballena Berry Mix | Ballena com morango e gelo | — |
| Ballena Tropical | Ballena com abacaxi e gelo | — |
| SIX Vila Nova | A bebida 6 estrelas: purê Monin de frutas vermelhas com espumante gelado, servido na taça flute. Decorado com fruta do dia. | — |

**SIX Vila Nova é o drink-assinatura da casa**: dê a ele um card diferenciado com o motivo das 6 estrelas (✦✦✦✦✦✦).

**Rodapé do cardápio do aluno**: "Análise nutricional: Dr. Leandro Vaz — Médico do Esporte e Nutrólogo" + links de Instagram @sixhealth.br e @sixwownessbar.

Modelo de item no banco: nome, descrição curta, preço (opcional), categoria, foto (opcional, com fallback bonito usando a cor da categoria), flag de disponibilidade, grupos de personalização (escolha única obrigatória ou múltipla opcional, cada opção podendo ter acréscimo de preço).

## Design — siga as referências anexadas

Analise `Foto_drinks.jpeg`, `Video_drinks.mp4` e `Cardapio.jpeg` antes de escrever qualquer CSS. A identidade é **coquetelaria de luxo, não lanchonete**:

- **Fundo**: preto quente, quase absoluto (`#0B0B0A`), com superfícies em cinza-chumbo (`#1C1C1C`).
- **Cor de destaque**: o creme dos copos SIX (`#E9DCC3`) — usar em botões primários, preços e no QR impresso. Texto sobre creme: preto.
- **Acentos vibrantes** (das cores dos drinks): vermelho hibisco `#B3122F`, amarelo manga `#F2A900`, rosa morango `#E8A7A0` — usar com parcimônia em categorias e estados.
- **Madeira** (`#8A5A2B`) apenas como detalhe sutil, se couber.
- **Tipografia**: títulos em sans condensada alta e imponente, estilo do logo SIX (ex.: Archivo Expanded/Condensed, Oswald ou similar do Google Fonts), com "SPORT LIFE" em tracking bem aberto; corpo em sans limpa (Inter).
- **Herde o estilo editorial do cardápio físico** (`Cardapio.jpeg`): títulos de categoria em versalete com espaçamento generoso (CAFÉS, PRÉ-TREINO, HIDRATE-SE...), divisórias em linhas finas, ornamentos ✦ discretos, e um toque de serifa itálica elegante reservado à seção "Drinks Six Health". O selo circular "SIX Wowness Club" pode aparecer pequeno no topo do cardápio digital. Na prática: o app é a versão noturna do cardápio impresso — fundo escuro do bar com as seções em cartões creme, como o cartão físico sobre a mesa de madeira.
- **Motivo da anilha**: os copos ficam sobre apoios em formato de anilha de academia — use essa forma como assinatura visual (spinner de loading, indicador de status do pedido, bullet das categorias).
- Luz âmbar quente nas fotos, cantos levemente arredondados, sombras suaves e profundas. Microinterações discretas (transições de 150–250ms). Nada de cores saturadas de app de delivery, nada de emoji, nada de visual genérico.
- O painel do bar prioriza **legibilidade a 1 metro de distância**: cards grandes, alto contraste, botões de status gigantes (uso com dedo em tablet).

## Stack e deploy

- **Next.js (App Router) + Supabase (Postgres + Realtime) + deploy na Vercel.** Justificativa: zero servidor para manter, realtime nativo para a fila do bar, tier gratuito comporta o volume de um bar de academia.
- Realtime via subscription do Supabase nas tabelas de pedidos (fila do bar e tela de acompanhamento do aluno).
- Tabelas sugeridas: `categories`, `menu_items`, `orders`, `order_items`, `settings` (bar aberto, locais da academia, PIN hashes, minutos de alerta).
- Proteção de `/bar` e `/admin` com PIN via cookie de sessão (middleware). Não precisa de auth completa na v1.
- Gere o schema SQL completo (com RLS: escrita de pedidos aberta apenas para inserts válidos; gestão apenas autenticada por PIN/server actions) e as instruções passo a passo de setup do Supabase + Vercel, incluindo variáveis de ambiente.
- Se eu pedir uma alternativa sem Supabase, ofereça: Node/Express + SQLite + Socket.io num Railway/Render — mas o padrão é o de cima.

## Critérios de aceite (teste antes de entregar)

- [ ] Pedido feito no celular aparece no painel do bar em menos de 2 segundos, com som, sem refresh.
- [ ] Mudança de status no bar reflete na tela do aluno em tempo real.
- [ ] Item marcado indisponível some do cardápio imediatamente.
- [ ] Bar fechado bloqueia novos pedidos com mensagem elegante.
- [ ] Cardápio perfeito num viewport de 390px; painel do bar perfeito num tablet horizontal.
- [ ] QR gerado em `/qr` aponta para a URL de produção e imprime bem em A5.
- [ ] Admin permite criar/editar/remover categorias, itens e personalizações sem tocar em código.
- [ ] "Divirta-se" invisível para pedidos de segunda a quinta, ativa sexta a domingo, e liberável manualmente em feriados pelo painel do bar.
- [ ] Nenhum valor em R$ aparece na UI enquanto os itens estiverem sem preço cadastrado.
- [ ] Lighthouse mobile ≥ 90 em performance e acessibilidade no cardápio.

## Fora do escopo da v1 (não construa agora)

- Pagamento online, integração com sistema da academia, notificação por WhatsApp/push (v2 — mencione no README como evoluir, ex.: webhook do Supabase → n8n → WhatsApp), múltiplas unidades, app nativo.

## Como trabalhar

- Antes de codar, me mostre em poucas linhas: o schema do banco e o mapa de rotas. Depois execute tudo sem parar para perguntar, com commits pequenos e mensagens claras.
- Não invente preços nem nomes de produtos como se fossem reais — itens de exemplo devem estar claramente marcados.
- Ao final, entregue um README em PT-BR com: setup do Supabase, deploy na Vercel, como trocar o cardápio, como trocar os PINs e como imprimir o QR.
