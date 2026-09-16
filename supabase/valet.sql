-- ═══════════════════════════════════════════════════════════════════
--  SIX — Módulo VALET (Supabase / Postgres)
--
--  Mesmo isolamento do bar: tudo vive no schema próprio `valet`. Nada
--  aqui cria ou altera tabela em `public` (six_control) — só REFERENCIA
--  public.units e reaproveita as funções public.can_see_all() /
--  public.auth_unit_id() nas policies, igual ao bar.
--
--  Rode este arquivo inteiro no SQL Editor do Supabase.
--  Idempotente: pode ser reexecutado com segurança.
--
--  PASSO MANUAL OBRIGATÓRIO (fora deste SQL):
--  Project Settings → Data API → "Exposed schemas": adicione `valet`
--  (ex.: "public, graphql_public, bar, valet"). Sem isso o app não
--  enxerga as tabelas do valet.
-- ═══════════════════════════════════════════════════════════════════

create schema if not exists valet;

-- ─────────────────────────── Tabelas ───────────────────────────────

-- Um "ticket" = um carro deixado no valet, da chegada até a devolução.
--  status: aguardando  → aluno avisou que chegou (ou motorista abriu), carro ainda não recebido
--          estacionado → motorista recebeu, fotografou (chegada) e estacionou
--          solicitado  → aluno pediu o carro de volta
--          buscando    → motorista a caminho do carro
--          pronto      → carro na saída, fotografado (devolução), esperando o aluno
--          entregue    → motorista conferiu o código e entregou a chave
--          cancelado
create table if not exists valet.tickets (
  id              uuid primary key default gen_random_uuid(),
  unit_id         uuid not null references public.units(id),
  code            text not null,                              -- código curto que o aluno mostra (#K7P2)
  public_token    uuid not null default gen_random_uuid(),    -- segredo guardado só no celular do aluno
  customer_name   text not null check (length(btrim(customer_name)) > 0),
  customer_phone  text,
  plate           text not null check (length(btrim(plate)) > 0),
  car_model       text,
  car_color       text,
  parking_spot    text,                                        -- vaga / onde a chave ficou
  notes           text,
  status          text not null default 'aguardando'
                  check (status in ('aguardando','estacionado','solicitado','buscando','pronto','entregue','cancelado')),
  created_by      text not null default 'aluno' check (created_by in ('aluno','motorista')),
  checkin_by      uuid,                                        -- auth.users.id de quem recebeu o carro
  checkout_by     uuid,                                        -- quem fotografou na devolução
  delivered_by    uuid,                                        -- quem entregou a chave
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  checked_in_at   timestamptz,
  requested_at    timestamptz,
  ready_at        timestamptz,
  delivered_at    timestamptz,
  updated_at      timestamptz not null default now()
);

create table if not exists valet.photos (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references valet.tickets(id) on delete cascade,
  phase         text not null check (phase in ('checkin','checkout')),
  slot          text not null check (slot in ('frente','traseira','lateral_esq','lateral_dir','extra')),
  storage_path  text not null,                                -- caminho no bucket valet-photos
  taken_by      uuid,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz                                   -- arquivo apagado pela retenção de 30 dias
);

-- Ajustes por unidade (mesmo formato de bar.settings). Chave usada hoje:
--   valet_enabled (boolean) — liga o valet na unidade e a tela "O que deseja hoje?" do QR.
create table if not exists valet.settings (
  unit_id    uuid not null references public.units(id),
  key        text not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (unit_id, key)
);

-- ─────────────────────────── Índices ───────────────────────────────

create index if not exists idx_valet_tickets_unit_status on valet.tickets (unit_id, status, created_at);
create index if not exists idx_valet_tickets_created on valet.tickets (created_at desc);
create index if not exists idx_valet_photos_ticket on valet.photos (ticket_id, phase);
create index if not exists idx_valet_photos_created on valet.photos (created_at) where deleted_at is null;

-- Código e placa únicos só entre carros ATIVOS da unidade (depois de entregue, podem repetir).
create unique index if not exists uq_valet_active_code on valet.tickets (unit_id, code)
  where status not in ('entregue','cancelado');
create unique index if not exists uq_valet_active_plate on valet.tickets (unit_id, plate)
  where status not in ('entregue','cancelado');
create unique index if not exists uq_valet_token on valet.tickets (public_token);

-- ─────────────────── Trigger de updated_at ─────────────────────────

create or replace function valet.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_valet_tickets_updated_at on valet.tickets;
create trigger trg_valet_tickets_updated_at
  before update on valet.tickets
  for each row execute function valet.set_updated_at();

-- ─────────── Abertura atômica do ticket (código único) ─────────────
--  Gera um código de 4 caracteres sem ambíguos (0/O, 1/I), único entre
--  os carros ativos da unidade. Só a service_role executa.

create or replace function valet.create_ticket(
  p_unit_id        uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_plate          text,
  p_created_by     text
)
returns table (id uuid, code text, public_token uuid)
language plpgsql
security definer
set search_path = valet, pg_catalog
as $$
#variable_conflict use_column
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code  text;
  new_id    uuid;
  new_token uuid;
begin
  if p_unit_id is null then raise exception 'Ticket sem unidade'; end if;

  loop
    new_code := '';
    for i in 1..4 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from valet.tickets t
      where t.unit_id = p_unit_id and t.code = new_code
        and t.status not in ('entregue','cancelado')
    );
  end loop;

  insert into valet.tickets (unit_id, code, customer_name, customer_phone, plate, created_by)
  values (p_unit_id, new_code, p_customer_name, p_customer_phone, p_plate, p_created_by)
  returning tickets.id, tickets.public_token into new_id, new_token;

  return query select new_id, new_code, new_token;
end;
$$;

-- ═══════════════════════ Row Level Security ════════════════════════
--  Aluno (anon) NÃO lê nada direto: placa + telefone são dado pessoal.
--  O acompanhamento do aluno passa pelo servidor com o public_token.
--  Motorista logado (authenticated) lê só os carros da própria unidade
--  (Master/Sócio: todas) — é o que alimenta a fila em tempo real.

alter table valet.tickets  enable row level security;
alter table valet.photos   enable row level security;
alter table valet.settings enable row level security;

drop policy if exists p_valet_tickets_read_auth on valet.tickets;
create policy p_valet_tickets_read_auth on valet.tickets for select to authenticated
  using (public.can_see_all() or unit_id = public.auth_unit_id());

drop policy if exists p_valet_photos_read_auth on valet.photos;
create policy p_valet_photos_read_auth on valet.photos for select to authenticated
  using (
    exists (
      select 1 from valet.tickets t
      where t.id = photos.ticket_id
        and (public.can_see_all() or t.unit_id = public.auth_unit_id())
    )
  );

-- Nenhuma policy de escrita: todo write passa pela service_role (Server Actions).

grant usage on schema valet to anon, authenticated, service_role;
grant all privileges on all tables in schema valet to service_role;
grant select on valet.tickets, valet.photos to authenticated;

revoke all on function valet.create_ticket(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function valet.create_ticket(uuid, text, text, text, text) to service_role;

-- ═══════════════════════════ Realtime ══════════════════════════════

alter table valet.tickets replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'valet' and tablename = 'tickets'
  ) then
    alter publication supabase_realtime add table valet.tickets;
  end if;
end $$;

-- ═════════════════════ Storage das fotos ═══════════════════════════
--  Bucket PRIVADO. Sem policies de storage: ninguém lê/grava direto.
--  Upload do motorista usa URL assinada gerada no servidor; exibição
--  também usa URL assinada temporária. Fotos com mais de 30 dias são
--  apagadas por uma rotina diária (/api/cron/valet-cleanup).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('valet-photos', 'valet-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
