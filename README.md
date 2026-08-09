# SIX Wowness Club — Pedidos via QR Code

Sistema de pedidos por QR Code para o bar da **SIX Sport Life**. O aluno escaneia um QR espalhado pela academia, monta o pedido no próprio celular e envia — o time do bar recebe **em tempo real** numa tela no balcão, com **alerta sonoro**. Sem app, sem login, sem pagamento (tudo incluso na matrícula).

Feito para rodar de graça: **Next.js 15 (App Router) + Supabase (Postgres + Realtime) + Vercel**.

---

## Índice

- [O que tem pronto](#o-que-tem-pronto)
- [Rotas](#rotas)
- [1. Setup do Supabase](#1-setup-do-supabase)
- [2. Variáveis de ambiente](#2-variáveis-de-ambiente)
- [3. Rodar localmente](#3-rodar-localmente)
- [4. Deploy na Vercel](#4-deploy-na-vercel)
- [5. Definir e trocar os PINs](#5-definir-e-trocar-os-pins)
- [6. Trocar o cardápio (sem código)](#6-trocar-o-cardápio-sem-código)
- [7. Imprimir o QR](#7-imprimir-o-qr)
- [Regras de negócio](#regras-de-negócio)
- [Como funciona o realtime e a segurança](#como-funciona-o-realtime-e-a-segurança)
- [Evoluções (v2)](#evoluções-v2)

---

## O que tem pronto

- **Cardápio do aluno** mobile-first, com carrinho, personalizações (xarope, base, sabor…), quantidade e observações.
- **Acompanhamento do pedido em tempo real** (Recebido → Em preparo → Pronto → Entregue) com vibração ao ficar *Pronto*.
- **Painel do bar** com fila em tempo real, som de novo pedido, tempo decorrido (fica vermelho após X min), botões grandes para tablet, cancelamento com motivo, histórico do dia e contadores.
- **Admin do cardápio**: CRUD completo de categorias, itens e personalizações + ajustes (locais, tempo de alerta, bar aberto/fechado, PINs).
- **Gerador de QR** pronto para impressão em A5 (PNG e SVG).
- Categoria **Divirta-se** liberada só de sexta a domingo, com botão de liberação manual em feriados.
- **Preço opcional**: enquanto os itens não tiverem preço cadastrado, nenhum valor em R$ aparece na interface.

O cardápio já vem populado (seed) com os itens reais transcritos do cardápio físico. Sabores de xarope cujo rótulo exato não consta no cardápio entram marcados com `(exemplo)` para você ajustar no `/admin`.

## Rotas

| Rota | O que é | Acesso |
|---|---|---|
| `/` | Cardápio do aluno (abre via QR) | Público |
| `/pedido/[id]` | Acompanhamento do pedido em tempo real | Público (link do próprio pedido) |
| `/bar` | Painel do bar (fila realtime + som) | PIN |
| `/admin` | Admin do cardápio | PIN |
| `/qr` | Gerador de QR para impressão | Público |

---

## 1. Setup do Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um **novo projeto** (o plano gratuito basta).
2. No painel do projeto, vá em **SQL Editor** e rode, **nesta ordem**:
   - `supabase/schema.sql` — cria tabelas, índices, RLS e habilita o realtime.
   - `supabase/seed.sql` — popula o cardápio inicial e os ajustes padrão.
   
   Basta abrir cada arquivo, colar o conteúdo no SQL Editor e clicar em **Run**. Ambos são seguros para reexecutar.
3. Confirme o realtime: **Database → Replication** (ou **Publications**) deve listar `orders` e `order_items` na publicação `supabase_realtime` (o `schema.sql` já faz isso).
4. Pegue as chaves em **Project Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secreta!) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

| Variável | Para que serve |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (leitura do cardápio + realtime no navegador) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta usada só no servidor (gravar pedidos, gestão) |
| `SESSION_SECRET` | Segredo para assinar o cookie de sessão e o hash dos PINs. Gere um valor longo e aleatório |
| `NEXT_PUBLIC_SITE_URL` | URL de produção (usada pelo gerador de QR). Ex.: `https://bar-six.vercel.app` |

Gere um `SESSION_SECRET` forte:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ Se você trocar o `SESSION_SECRET` depois de já ter definido PINs, os PINs param de validar (o hash muda). Nesse caso, redefina os PINs (veja a seção 5).

## 3. Rodar localmente

```bash
npm install
```

```bash
npm run dev
```

Abra `http://localhost:3000`. Painel do bar em `/bar`, admin em `/admin`.

## 4. Deploy na Vercel

1. Suba o projeto para um repositório (GitHub/GitLab) e importe em [vercel.com](https://vercel.com) — ou use a CLI com `vercel`.
2. Em **Settings → Environment Variables**, cadastre **as mesmas 5 variáveis** do `.env.local` (marque para Production e Preview). Defina `NEXT_PUBLIC_SITE_URL` com a URL final do projeto.
3. Deploy. A Vercel detecta Next.js automaticamente (build: `next build`).
4. Após o primeiro deploy, acesse `/bar` e `/admin` e **defina os PINs imediatamente** (seção 5).

## 5. Definir e trocar os PINs

O `/bar` e o `/admin` são protegidos por um PIN simples (cookie de sessão assinado; o admin também acessa o painel do bar).

- **Primeiro acesso:** ao abrir `/bar/login` ou `/admin/login` sem PIN configurado, aparece o formulário **"Definir PIN"**. Defina ali (4 a 8 dígitos). Faça isso logo após o deploy.
- **Trocar depois:** entre no `/admin` → aba **Ajustes** → seção **Segurança — PINs**. Dá para alterar o PIN do bar e do admin sem tocar em código.
- **Pré-configurar por script (opcional):** para já subir com PINs definidos, rode:

```bash
node --env-file=.env.local scripts/set-pins.mjs --bar 2468 --admin 1379
```

> Dica de segurança: defina os PINs assim que publicar, antes de divulgar as URLs.

## 6. Trocar o cardápio (sem código)

Tudo pelo `/admin` (aba **Cardápio**):

- **Categorias:** criar, editar (nome, subtítulo, nota, cor de acento, ordem, dias disponíveis, seção-assinatura) e remover.
- **Itens:** criar/editar/remover; definir descrição, **preço opcional** (deixe vazio para não exibir valor), foto (URL), disponibilidade, tag **+18**, selo de estrelas e ordem.
- **Personalizações:** por item, criar grupos (escolha única/múltipla, obrigatório/opcional) e suas opções (com acréscimo opcional de preço).
- **Disponibilidade rápida:** no `/bar`, botão **Itens** abre o controle de disponibilidade — desligar um item o remove do cardápio do aluno na próxima abertura, sem deploy.

Para repovoar do zero, rode novamente `supabase/seed.sql` (ele não duplica itens já existentes).

## 7. Imprimir o QR

1. Acesse `/qr`. O QR já aponta para a URL de produção (`NEXT_PUBLIC_SITE_URL`); dá para editar o destino no campo de texto.
2. **Baixar PNG** / **Baixar SVG** para artes, ou **Imprimir (A5)** para gerar direto — o layout de impressão sai em folha A5, QR preto sobre fundo creme, com a marca SIX.
3. Espalhe nos tablets e pontos da academia.

---

## Regras de negócio

- **Sem pagamento e sem cadastro do aluno.** Nome + local bastam para pedir.
- **Preço é opcional.** Sem preço cadastrado, nenhuma menção a valor aparece; com preço, exibe em R$.
- **Divirta-se (alcoólicos):** só aparece e aceita pedidos de **sexta a domingo**. Nos outros dias fica recolhida com a nota "disponível sexta, sábado, domingo e feriados". Em feriados, use **Liberar Divirta-se hoje** no painel do bar (vale até o fim do dia). Itens levam tag **+18** e o carrinho exibe o aviso de venda/consumo para maiores de 18.
- **Bar fechado** bloqueia novos pedidos (o botão de enviar é barrado e o servidor recusa, mesmo que a tela esteja aberta há tempos).
- **Fila do bar** ordenada por chegada, com tempo decorrido que fica vermelho após o tempo configurado em Ajustes.
- **Histórico do dia** guarda entregues/cancelados com contadores e itens mais pedidos.

## Como funciona o realtime e a segurança

- O navegador usa a **chave anônima** só para **ler** cardápio e pedidos e para as **subscriptions de realtime** (fila do bar e tela do aluno).
- **Toda escrita** (registrar pedido, mudar status, disponibilidade, CRUD, PINs) passa por **Server Actions** no servidor, usando a **service_role**. O servidor **reconstrói o pedido a partir dos IDs** e revalida as regras (bar aberto, categoria liberada no dia, item disponível) — nunca confia em preço/nome vindos do cliente.
- **RLS** liga: leitura pública de cardápio/pedidos, leitura de `settings` só nas linhas públicas (o hash do PIN fica oculto), e **nenhuma** permissão de escrita para o anônimo.
- O pedido e seus itens são gravados **numa única transação** (função `create_order` no Postgres, executável só pela `service_role`). Assim o evento de realtime só chega ao balcão depois do commit — o painel nunca mostra um card sem itens.
- Os PINs são guardados como **hash** (SHA-256 com o `SESSION_SECRET`), nunca em texto puro.

> Observação de privacidade (v1): como a fila do bar usa realtime com a chave anônima, os pedidos (nome + local) são legíveis por quem tiver a chave pública. Para um bar de academia isso é aceitável; a evolução para leitura autenticada está na v2.

## Evoluções (v2)

Fora do escopo desta versão, mas fáceis de plugar depois:

- **Notificação no WhatsApp** do bar: criar um **Database Webhook** no Supabase na tabela `orders` (evento INSERT) apontando para um fluxo **n8n**, que dispara a mensagem no WhatsApp. Nenhuma mudança no app é necessária.
- **Push/PWA** para o tablet do bar (Web Push) como reforço ao alerta sonoro.
- **Leitura autenticada** da fila (Supabase Auth para o bar) para fechar o acesso público aos pedidos.
- Integração com o sistema da academia, múltiplas unidades e pagamento — se um dia fizer sentido.

---

Feito com carinho para a SIX. **@sixhealth.br · @sixwownessbar**
