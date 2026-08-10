-- ═══════════════════════════════════════════════════════════════════
--  SIX Wowness Club — Schema do banco (Supabase / Postgres)
--
--  ISOLAMENTO: este projeto Supabase já hospeda outro sistema
--  (six_control) no schema `public`. Este arquivo NUNCA cria, altera
--  ou referencia nada em `public`. TUDO do bar vive num schema próprio
--  chamado `bar` — tabelas, funções, policies e a publicação de
--  realtime são todas qualificadas com `bar.`.
--
--  Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
--  Idempotente: pode ser reexecutado com segurança.
--
--  PASSO MANUAL OBRIGATÓRIO (fora deste SQL):
--  Vá em Project Settings → Data API → "Exposed schemas" e adicione
--  `bar` à lista (ex.: "public, graphql_public, bar"). Sem isso, a
--  API (PostgREST) não serve as tabelas do schema bar e o app recebe
--  erro "schema must be one of the following: ...".
-- ═══════════════════════════════════════════════════════════════════

create schema if not exists bar;

-- ─────────────────────────── Tabelas ───────────────────────────────

create table if not exists bar.categories (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name           text not null,
  subtitle       text,
  note           text,
  color          text not null default '#E9DCC3',
  sort_order     integer not null default 0,
  available_days integer[],                 -- null = todos os dias; senão 0=Dom … 6=Sáb
  is_signature   boolean not null default false,
  created_at     timestamptz not null default now()
);

create table if not exists bar.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references bar.categories(id) on delete cascade,
  name         text not null,
  description  text,
  price        numeric(10,2),               -- OPCIONAL. null = sem preço na UI.
  image_url    text,
  is_available boolean not null default true,
  is_alcoholic boolean not null default false,
  is_signature boolean not null default false,
  stars        integer,                     -- selo de estrelas (ex.: SIX Vila Nova = 6)
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (category_id, name)
);

create table if not exists bar.option_groups (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references bar.menu_items(id) on delete cascade,
  name         text not null,
  kind         text not null default 'single' check (kind in ('single','multiple')),
  required     boolean not null default false,
  sort_order   integer not null default 0,
  unique (menu_item_id, name)
);

create table if not exists bar.options (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references bar.option_groups(id) on delete cascade,
  name        text not null,
  price_delta numeric(10,2) not null default 0,
  sort_order  integer not null default 0,
  unique (group_id, name)
);

create table if not exists bar.orders (
  id            uuid primary key default gen_random_uuid(),
  short_code    text not null default upper(substr(md5(random()::text), 1, 4)),
  customer_name text not null check (length(btrim(customer_name)) > 0),
  location      text not null check (length(btrim(location)) > 0),
  notes         text,
  status        text not null default 'recebido'
                check (status in ('recebido','preparo','pronto','entregue','cancelado')),
  cancel_reason text,
  total         numeric(10,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists bar.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references bar.orders(id) on delete cascade,
  item_name        text not null,
  quantity         integer not null default 1 check (quantity > 0),
  unit_price       numeric(10,2),
  selected_options jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

create table if not exists bar.settings (
  key        text primary key,
  value      jsonb,
  is_public  boolean not null default true,   -- linhas secretas (hash de PIN) = false
  updated_at timestamptz not null default now()
);

-- ─────────────────────────── Índices ───────────────────────────────

create index if not exists idx_bar_menu_items_category on bar.menu_items (category_id, sort_order);
create index if not exists idx_bar_option_groups_item on bar.option_groups (menu_item_id, sort_order);
create index if not exists idx_bar_options_group on bar.options (group_id, sort_order);
create index if not exists idx_bar_orders_status on bar.orders (status, created_at);
create index if not exists idx_bar_orders_created on bar.orders (created_at desc);
create index if not exists idx_bar_order_items_order on bar.order_items (order_id);
create unique index if not exists uq_bar_orders_short_code on bar.orders (short_code);

-- ─────────────────── Trigger de updated_at (orders) ────────────────

create or replace function bar.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bar_orders_updated_at on bar.orders;
create trigger trg_bar_orders_updated_at
  before update on bar.orders
  for each row execute function bar.set_updated_at();

-- ─────────── Código curto único e legível (#A1B2) ──────────────────
--  Alfabeto sem caracteres ambíguos (0/O, 1/I) para leitura no balcão.

create or replace function bar.gen_short_code()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from bar.orders o where o.short_code = code);
  end loop;
  return code;
end;
$$;

-- ─────────── Criação atômica do pedido (pedido + itens) ────────────
--  Grava tudo numa única transação: o evento de realtime só é emitido
--  após o commit, então o painel do bar nunca recebe um card sem itens.
--  SECURITY DEFINER com search_path fixo em bar (evita search_path
--  injection); só a service_role pode executar (grant no final).

create or replace function bar.create_order(
  p_customer_name text,
  p_location      text,
  p_notes         text,
  p_total         numeric,
  p_items         jsonb
)
returns table (id uuid, short_code text)
language plpgsql
security definer
set search_path = bar, pg_catalog
as $$
#variable_conflict use_column
declare
  new_id   uuid;
  new_code text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  new_code := bar.gen_short_code();

  insert into bar.orders (short_code, customer_name, location, notes, status, total)
  values (new_code, p_customer_name, p_location, p_notes, 'recebido', p_total)
  returning orders.id into new_id;

  insert into bar.order_items (order_id, item_name, quantity, unit_price, selected_options)
  select
    new_id,
    it->>'item_name',
    (it->>'quantity')::int,
    nullif(it->>'unit_price', '')::numeric,
    coalesce(it->'selected_options', '[]'::jsonb)
  from jsonb_array_elements(p_items) as it;

  return query select new_id, new_code;
end;
$$;

-- ═══════════════════════ Row Level Security ════════════════════════
--  anon (chave pública, usada no navegador do aluno e do bar) só
--  recebe SELECT em bar.orders/bar.order_items — o resto (cardápio,
--  ajustes, escrita, status) passa sempre pela service_role no
--  servidor (Server Actions), que faz bypass de RLS.

alter table bar.categories    enable row level security;
alter table bar.menu_items    enable row level security;
alter table bar.option_groups enable row level security;
alter table bar.options       enable row level security;
alter table bar.orders        enable row level security;
alter table bar.order_items   enable row level security;
alter table bar.settings      enable row level security;

drop policy if exists p_bar_categories_read on bar.categories;
create policy p_bar_categories_read on bar.categories for select using (true);

drop policy if exists p_bar_menu_items_read on bar.menu_items;
create policy p_bar_menu_items_read on bar.menu_items for select using (true);

drop policy if exists p_bar_option_groups_read on bar.option_groups;
create policy p_bar_option_groups_read on bar.option_groups for select using (true);

drop policy if exists p_bar_options_read on bar.options;
create policy p_bar_options_read on bar.options for select using (true);

drop policy if exists p_bar_settings_public_read on bar.settings;
create policy p_bar_settings_public_read on bar.settings for select using (is_public = true);

drop policy if exists p_bar_orders_read on bar.orders;
create policy p_bar_orders_read on bar.orders for select using (true);

drop policy if exists p_bar_order_items_read on bar.order_items;
create policy p_bar_order_items_read on bar.order_items for select using (true);

-- Nenhuma policy de insert/update/delete para anon: todo write passa
-- pela service_role no servidor (Server Actions / função create_order).

-- ─────────────────── Privilégios (GRANT) — mínimo necessário ───────
--  Um schema novo não herda os privilégios automáticos que o Supabase
--  configura para `public`/`graphql_public` — precisa conceder à mão.
--  RLS restringe LINHAS; GRANT libera a operação na tabela. Os dois
--  juntos é que definem o acesso real.

grant usage on schema bar to anon, authenticated, service_role;

-- service_role: acesso total (usado pelo servidor via Server Actions;
-- ignora RLS, mas ainda precisa do GRANT de tabela).
grant all privileges on all tables in schema bar to service_role;

-- anon: só o mínimo para o app funcionar no navegador —
-- ler a fila/pedido em tempo real. Nada de cardápio/ajustes/escrita
-- (tudo isso é sempre renderizado no servidor com service_role).
grant select on bar.orders, bar.order_items to anon;

revoke all on function bar.create_order(text, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function bar.create_order(text, text, text, numeric, jsonb) to service_role;

-- ═══════════════════════════ Realtime ══════════════════════════════
--  Habilita realtime SÓ nas tabelas de pedidos do bar — nunca no
--  schema public (onde vive o six_control) e nunca no cardápio.

alter table bar.orders      replica identity full;
alter table bar.order_items replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'bar' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table bar.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'bar' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table bar.order_items;
  end if;
end $$;
