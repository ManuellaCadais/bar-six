-- ═══════════════════════════════════════════════════════════════════
--  SIX Wowness Club — Schema do banco (Supabase / Postgres)
--  Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
--  Idempotente: pode ser reexecutado com segurança.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────── Tabelas ───────────────────────────────

create table if not exists public.categories (
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

create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories(id) on delete cascade,
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

create table if not exists public.option_groups (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name         text not null,
  kind         text not null default 'single' check (kind in ('single','multiple')),
  required     boolean not null default false,
  sort_order   integer not null default 0,
  unique (menu_item_id, name)
);

create table if not exists public.options (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.option_groups(id) on delete cascade,
  name        text not null,
  price_delta numeric(10,2) not null default 0,
  sort_order  integer not null default 0,
  unique (group_id, name)
);

create table if not exists public.orders (
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

create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  item_name        text not null,
  quantity         integer not null default 1 check (quantity > 0),
  unit_price       numeric(10,2),
  selected_options jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

create table if not exists public.settings (
  key        text primary key,
  value      jsonb,
  is_public  boolean not null default true,   -- linhas secretas (hash de PIN) = false
  updated_at timestamptz not null default now()
);

-- ─────────────────────────── Índices ───────────────────────────────

create index if not exists idx_menu_items_category on public.menu_items (category_id, sort_order);
create index if not exists idx_option_groups_item on public.option_groups (menu_item_id, sort_order);
create index if not exists idx_options_group on public.options (group_id, sort_order);
create index if not exists idx_orders_status on public.orders (status, created_at);
create index if not exists idx_orders_created on public.orders (created_at desc);
create index if not exists idx_order_items_order on public.order_items (order_id);

-- ─────────────────── Trigger de updated_at (orders) ────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ═══════════════════════ Row Level Security ════════════════════════
--  Leitura pública do cardápio + pedidos (necessária para o realtime).
--  TODA escrita de gestão passa por Server Actions com service_role,
--  que ignora RLS. anon NÃO faz update/delete e não lê PIN.

alter table public.categories    enable row level security;
alter table public.menu_items    enable row level security;
alter table public.option_groups enable row level security;
alter table public.options       enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.settings      enable row level security;

-- Cardápio: leitura pública
drop policy if exists p_categories_read on public.categories;
create policy p_categories_read on public.categories for select using (true);

drop policy if exists p_menu_items_read on public.menu_items;
create policy p_menu_items_read on public.menu_items for select using (true);

drop policy if exists p_option_groups_read on public.option_groups;
create policy p_option_groups_read on public.option_groups for select using (true);

drop policy if exists p_options_read on public.options;
create policy p_options_read on public.options for select using (true);

-- Settings: anon só lê linhas públicas (esconde os hashes de PIN)
drop policy if exists p_settings_public_read on public.settings;
create policy p_settings_public_read on public.settings for select using (is_public = true);

-- Pedidos: leitura pública (acompanhamento do aluno + fila do bar via realtime)
drop policy if exists p_orders_read on public.orders;
create policy p_orders_read on public.orders for select using (true);

drop policy if exists p_order_items_read on public.order_items;
create policy p_order_items_read on public.order_items for select using (true);

-- Observação: não criamos policies de INSERT/UPDATE/DELETE para anon.
-- Todos os writes (pedido, status, disponibilidade, CRUD, PIN) usam a
-- service_role no servidor, que faz bypass de RLS. Isso garante que
-- só pedidos validados no servidor (bar aberto, categoria liberada no
-- dia, itens disponíveis) entrem no banco.

-- ═══════════════════════════ Realtime ══════════════════════════════
--  Habilita realtime nas tabelas de pedidos.

alter table public.orders      replica identity full;
alter table public.order_items replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
end $$;
