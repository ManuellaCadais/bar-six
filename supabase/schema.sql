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
--  MULTI-UNIDADE: bar.categories/orders/settings carregam `unit_id`,
--  referenciando DIRETO public.units (mesma tabela do six_control — FK
--  entre schemas do mesmo banco, sem duplicar a lista de unidades).
--  menu_items/option_groups/options/order_items NÃO têm unit_id próprio:
--  herdam a unidade via category_id/menu_item_id/order_id, exatamente
--  como o six_control faz com suas tabelas filhas.

create table if not exists bar.categories (
  id             uuid primary key default gen_random_uuid(),
  unit_id        uuid references public.units(id),
  slug           text not null,
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
  unit_id       uuid references public.units(id),
  short_code    text not null default upper(substr(md5(random()::text), 1, 4)),
  customer_name text not null check (length(btrim(customer_name)) > 0),
  location      text not null check (length(btrim(location)) > 0),
  notes         text,
  status        text not null default 'recebido'
                check (status in ('recebido','preparo','pronto','entregue','cancelado')),
  cancel_reason text,
  total         numeric(10,2),
  seen_at       timestamptz,                -- quando o bar confirmou que viu o pedido (silencia o alarme)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Migração aditiva: se a tabela já existia (instalação anterior), garante a coluna.
alter table bar.orders add column if not exists seen_at timestamptz;

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
  unit_id    uuid references public.units(id),
  key        text not null,
  value      jsonb,
  is_public  boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (unit_id, key)
);

-- ─────── Migração multi-unidade (unit_id em categories/orders/settings) ───────
--  Instalação nova: as colunas já nascem certas pelo create table acima.
--  Instalação existente (tabelas já criadas antes, sem unit_id): create table
--  if not exists é um no-op nesse caso, então a coluna precisa ser adicionada
--  à mão aqui — mesmo padrão já usado pra seen_at logo acima.
alter table bar.categories add column if not exists unit_id uuid references public.units(id);
alter table bar.orders     add column if not exists unit_id uuid references public.units(id);
alter table bar.settings   add column if not exists unit_id uuid references public.units(id);

--  Preenche unit_id com o id de VNC e só então torna a coluna obrigatória.
do $$
declare
  vnc_id uuid;
  pk_name text;
begin
  select id into vnc_id from public.units where code = 'VNC';

  if vnc_id is not null then
    update bar.categories set unit_id = vnc_id where unit_id is null;
    update bar.orders     set unit_id = vnc_id where unit_id is null;
    update bar.settings   set unit_id = vnc_id where unit_id is null;
  end if;

  -- só força NOT NULL se não sobrou nenhuma linha órfã (sem unidade resolvida)
  if not exists (select 1 from bar.categories where unit_id is null) then
    alter table bar.categories alter column unit_id set not null;
  end if;
  if not exists (select 1 from bar.orders where unit_id is null) then
    alter table bar.orders alter column unit_id set not null;
  end if;
  if not exists (select 1 from bar.settings where unit_id is null) then
    alter table bar.settings alter column unit_id set not null;
  end if;

  -- categories.slug era único globalmente; agora é único POR unidade
  -- (unidades diferentes têm categorias com o mesmo slug, ex. "cafes").
  select conname into pk_name
  from pg_constraint
  where conrelid = 'bar.categories'::regclass and contype = 'u';
  if pk_name is not null then
    execute format('alter table bar.categories drop constraint %I', pk_name);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'uq_bar_categories_unit_slug'
  ) then
    alter table bar.categories add constraint uq_bar_categories_unit_slug unique (unit_id, slug);
  end if;

  -- bar.settings: a PK original era só (key); troca pra (unit_id, key).
  -- Descobre o nome real da constraint (em vez de chutar) e só mexe se
  -- ela ainda for de 1 coluna só — se já for (unit_id, key), não faz nada
  -- (instalação nova, ou essa migração já rodou antes).
  declare
    pk_cols int;
  begin
    select conname, array_length(conkey, 1) into pk_name, pk_cols
    from pg_constraint
    where conrelid = 'bar.settings'::regclass and contype = 'p';

    if pk_name is not null and pk_cols = 1 then
      execute format('alter table bar.settings drop constraint %I', pk_name);
      alter table bar.settings add primary key (unit_id, key);
    end if;
  end;

  -- Sistema de PIN antigo removido (login agora é a conta do six-control) —
  -- limpa as linhas órfãs de hash de PIN, se sobrou alguma de instalação anterior.
  delete from bar.settings where key in ('bar_pin_hash', 'admin_pin_hash');
end $$;

-- ─────────────────────────── Índices ───────────────────────────────

create index if not exists idx_bar_categories_unit on bar.categories (unit_id, sort_order);
create index if not exists idx_bar_menu_items_category on bar.menu_items (category_id, sort_order);
create index if not exists idx_bar_option_groups_item on bar.option_groups (menu_item_id, sort_order);
create index if not exists idx_bar_options_group on bar.options (group_id, sort_order);
create index if not exists idx_bar_orders_unit on bar.orders (unit_id, status, created_at);
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

-- Assinatura antiga (sem unit_id) sai de cena — create-or-replace não troca
-- lista de parâmetros, só sobrepõe função com a MESMA assinatura.
drop function if exists bar.create_order(text, text, text, numeric, jsonb);

create or replace function bar.create_order(
  p_unit_id       uuid,
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
  if p_unit_id is null then
    raise exception 'Pedido sem unidade';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  new_code := bar.gen_short_code();

  insert into bar.orders (unit_id, short_code, customer_name, location, notes, status, total)
  values (p_unit_id, new_code, p_customer_name, p_location, p_notes, 'recebido', p_total)
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

-- ─────── Clonar cardápio entre unidades (bootstrap de unidade nova) ───────
--  Copia categories → menu_items → option_groups → options de uma unidade
--  pra outra, gerando IDs novos em cada nível. Só a service_role executa
--  (chamada pela Server Action cloneMenuToUnit, restrita a quem tem
--  canViewAllUnits) — quem chama marca depois a flag de "revisar cardápio"
--  em bar.settings, fora desta função.
create or replace function bar.clone_menu_to_unit(p_source_unit uuid, p_target_unit uuid)
returns void
language plpgsql
security definer
set search_path = bar, pg_catalog
as $$
declare
  cat        record;
  new_cat_id uuid;
  item       record;
  new_item_id uuid;
  grp        record;
  new_grp_id uuid;
  opt        record;
begin
  if p_source_unit is null or p_target_unit is null then
    raise exception 'Unidade de origem/destino ausente';
  end if;
  if p_source_unit = p_target_unit then
    raise exception 'Unidade de origem e destino são a mesma';
  end if;

  for cat in select * from bar.categories where unit_id = p_source_unit loop
    insert into bar.categories
      (unit_id, slug, name, subtitle, note, color, sort_order, available_days, is_signature)
    values
      (p_target_unit, cat.slug, cat.name, cat.subtitle, cat.note, cat.color, cat.sort_order,
       cat.available_days, cat.is_signature)
    returning categories.id into new_cat_id;

    for item in select * from bar.menu_items where category_id = cat.id loop
      insert into bar.menu_items
        (category_id, name, description, price, image_url, is_available, is_alcoholic,
         is_signature, stars, sort_order)
      values
        (new_cat_id, item.name, item.description, item.price, item.image_url,
         item.is_available, item.is_alcoholic, item.is_signature, item.stars, item.sort_order)
      returning menu_items.id into new_item_id;

      for grp in select * from bar.option_groups where menu_item_id = item.id loop
        insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
        values (new_item_id, grp.name, grp.kind, grp.required, grp.sort_order)
        returning option_groups.id into new_grp_id;

        for opt in select * from bar.options where group_id = grp.id loop
          insert into bar.options (group_id, name, price_delta, sort_order)
          values (new_grp_id, opt.name, opt.price_delta, opt.sort_order);
        end loop;
      end loop;
    end loop;
  end loop;
end;
$$;

revoke all on function bar.clone_menu_to_unit(uuid, uuid) from public, anon, authenticated;
grant execute on function bar.clone_menu_to_unit(uuid, uuid) to service_role;

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

-- Pedidos: leitura separada por papel.
--  anon (aluno, sem login): continua aberta — a tela de acompanhamento só
--  sabe o próprio id de pedido, baixa sensibilidade (nome + local).
--  authenticated (bar/admin logados): filtrada por unidade — reaproveita
--  as MESMAS funções que o six_control já definiu em public
--  (0002_rls_policies.sql), chamadas aqui qualificadas com `public.`.
--  É isso que garante que a fila em tempo real de uma unidade nunca
--  entrega pedido de outra pro navegador logado.
drop policy if exists p_bar_orders_read on bar.orders;
drop policy if exists p_bar_orders_read_anon on bar.orders;
drop policy if exists p_bar_orders_read_auth on bar.orders;
create policy p_bar_orders_read_anon on bar.orders for select to anon using (true);
create policy p_bar_orders_read_auth on bar.orders for select to authenticated
  using (public.can_see_all() or unit_id = public.auth_unit_id());

drop policy if exists p_bar_order_items_read on bar.order_items;
drop policy if exists p_bar_order_items_read_anon on bar.order_items;
drop policy if exists p_bar_order_items_read_auth on bar.order_items;
create policy p_bar_order_items_read_anon on bar.order_items for select to anon using (true);
create policy p_bar_order_items_read_auth on bar.order_items for select to authenticated
  using (
    exists (
      select 1 from bar.orders o
      where o.id = order_items.order_id
        and (public.can_see_all() or o.unit_id = public.auth_unit_id())
    )
  );

-- Nenhuma policy de insert/update/delete para anon nem authenticated:
-- todo write passa pela service_role no servidor (Server Actions / create_order).

-- ─────────────────── Privilégios (GRANT) — mínimo necessário ───────
--  Um schema novo não herda os privilégios automáticos que o Supabase
--  configura para `public`/`graphql_public` — precisa conceder à mão.
--  RLS restringe LINHAS; GRANT libera a operação na tabela. Os dois
--  juntos é que definem o acesso real.

grant usage on schema bar to anon, authenticated, service_role;

-- service_role: acesso total (usado pelo servidor via Server Actions;
-- ignora RLS, mas ainda precisa do GRANT de tabela).
grant all privileges on all tables in schema bar to service_role;

-- anon: só o mínimo para o app funcionar no navegador do aluno —
-- ler a fila/pedido em tempo real. Nada de cardápio/ajustes/escrita
-- (tudo isso é sempre renderizado no servidor com service_role).
grant select on bar.orders, bar.order_items to anon;

-- authenticated: mesma leitura de orders/order_items, mas filtrada por
-- unidade via RLS (políticas acima) — é o painel do bar logado usando a
-- própria sessão pra assinar o realtime da fila.
grant select on bar.orders, bar.order_items to authenticated;

revoke all on function bar.create_order(uuid, text, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function bar.create_order(uuid, text, text, text, numeric, jsonb) to service_role;

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
