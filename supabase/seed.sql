-- ═══════════════════════════════════════════════════════════════════
--  SIX Wowness Club — Seed do cardápio (transcrito do cardápio físico)
--  Rode DEPOIS do schema.sql. Seguro para reexecutar (ON CONFLICT).
--  Tudo qualificado com o schema `bar` — não toca em `public`.
--
--  NOTAS DE HONESTIDADE:
--   • O cardápio físico NÃO exibe preços → todos os itens entram SEM preço.
--   • Sabores de xarope cujo rótulo exato não está no cardápio entram
--     marcados como "(exemplo)" para o bar ajustar no /admin.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────── Categorias ────────────────────────────
insert into bar.categories (slug, name, subtitle, note, color, sort_order, available_days, is_signature) values
  ('drinks-six-health', 'Drinks Six Health', 'A assinatura da casa', null, '#E9DCC3', 5, null, true),
  ('cafes',             'Cafés',             null, null, '#B98A4E', 10, null, false),
  ('pre-treino',        'Pré-Treino',        null, null, '#F2A900', 20, null, false),
  ('hidrate-se',        'Hidrate-se',        null, null, '#E8A7A0', 30, null, false),
  ('pos-treino',        'Pós-Treino',        null, null, '#D9743B', 40, null, false),
  ('divirta-se',        'Divirta-se',        'Para brindar o treino',
     'Disponível sexta, sábado, domingo e feriados', '#B3122F', 50, array[5,6,0], false)
on conflict (slug) do nothing;

-- ──────────────────────── Itens: Drinks Six Health ─────────────────
insert into bar.menu_items (category_id, name, description, sort_order)
select c.id, v.name, v.descr, v.ord
from (select id from bar.categories where slug = 'drinks-six-health') c,
(values
  ('Pré-treino Six Health', 'Café espresso, whey, espuma de leite e canela. Uma combinação inteligente para ativar corpo e mente antes do treino.', 10),
  ('Pós-treino Six Health', 'Whey, creatina, glutamina, colágeno, iogurte, gelo e Monin de morango. Pensado para acelerar a recuperação e nutrir o corpo de forma estratégica.', 20)
) as v(name, descr, ord)
on conflict (category_id, name) do nothing;

-- ──────────────────────────── Itens: Cafés ─────────────────────────
insert into bar.menu_items (category_id, name, description, sort_order)
select c.id, v.name, v.descr, v.ord
from (select id from bar.categories where slug = 'cafes') c,
(values
  ('Espresso 3 Corações', 'Dark Roast, Chapada Diamantina', 10),
  ('Macchiato',           'Espresso com leite', 20),
  ('Hot Latte',           'Espresso com leite e xarope Monin', 30),
  ('Ice Latte',           'Espresso com leite, gelo e xarope Monin', 40)
) as v(name, descr, ord)
on conflict (category_id, name) do nothing;

-- ────────────────────────── Itens: Pré-Treino ──────────────────────
insert into bar.menu_items (category_id, name, description, sort_order)
select c.id, v.name, v.descr, v.ord
from (select id from bar.categories where slug = 'pre-treino') c,
(values
  ('Hot Shot Ultracoffee',  'Ultracoffee quente', 10),
  ('Ice Shot Ultra Coffee', 'Ultracoffee gelado', 20),
  ('Ice Shot Nitro 400',    'Nitro com água gelada', 30),
  ('Ice Nitro SIX',         'Nitro com Jungle', 40)
) as v(name, descr, ord)
on conflict (category_id, name) do nothing;

-- ────────────────────────── Itens: Hidrate-se ──────────────────────
insert into bar.menu_items (category_id, name, description, sort_order)
select c.id, v.name, v.descr, v.ord
from (select id from bar.categories where slug = 'hidrate-se') c,
(values
  ('Jungle com Monin',    'Batido com gelo e xarope Monin linha PURE', 10),
  ('Jungle com Colágeno', 'Batido com gelo e colágeno', 20),
  ('Ice Tea',             'Chá gelado', 30)
) as v(name, descr, ord)
on conflict (category_id, name) do nothing;

-- ────────────────────────── Itens: Pós-Treino ──────────────────────
insert into bar.menu_items (category_id, name, description, sort_order)
select c.id, v.name, v.descr, v.ord
from (select id from bar.categories where slug = 'pos-treino') c,
(values
  ('Protein SIX',      'Proteína, Jungle, Monin e gelo', 10),
  ('Protein Vegano',   'Proteína vegana e gelo', 20),
  ('Vitamina',         'Iogurte com whey vegano', 30),
  ('Whey Power Daily', 'A escolha perfeita para seu dia a dia! Whey com banana e mel. Ideal para café da manhã, lanche, pré ou pós-treino.', 40)
) as v(name, descr, ord)
on conflict (category_id, name) do nothing;

-- ─────────────────────────── Itens: Divirta-se ─────────────────────
--  Todos alcoólicos (+18). SIX Vila Nova é o drink-assinatura (6 estrelas).
insert into bar.menu_items (category_id, name, description, is_alcoholic, is_signature, stars, sort_order)
select c.id, v.name, v.descr, true, v.sig, v.stars, v.ord
from (select id from bar.categories where slug = 'divirta-se') c,
(values
  ('Cerveja',           'Long neck gelada', false, null::int, 10),
  ('Vinho do Dia',      'Consulte o rótulo do dia no balcão', false, null::int, 20),
  ('Bellini Pêssego',   'Com xarope Monin de pêssego', false, null::int, 30),
  ('Bellini Morango',   'Com xarope Monin de morango', false, null::int, 40),
  ('Ballena Berry Mix', 'Ballena com morango e gelo', false, null::int, 50),
  ('Ballena Tropical',  'Ballena com abacaxi e gelo', false, null::int, 60),
  ('SIX Vila Nova',     'A bebida 6 estrelas: purê Monin de frutas vermelhas com espumante gelado, servido na taça flute. Decorado com fruta do dia.', true, 6, 70)
) as v(name, descr, sig, stars, ord)
on conflict (category_id, name) do nothing;

-- ═════════════════════ Grupos de personalização ════════════════════

-- Cafés: Hot Latte / Ice Latte → Xarope Monin (única, obrigatória)
insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Xarope Monin', 'single', true, 10
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'cafes' and mi.name in ('Hot Latte', 'Ice Latte')
on conflict do nothing;

-- Pré-Treino: Ultracoffee quente/gelado → Sabor + Base (únicas, obrigatórias)
insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Sabor', 'single', true, 10
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'pre-treino' and mi.name in ('Hot Shot Ultracoffee', 'Ice Shot Ultra Coffee')
on conflict do nothing;

insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Base', 'single', true, 20
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'pre-treino' and mi.name in ('Hot Shot Ultracoffee', 'Ice Shot Ultra Coffee')
on conflict do nothing;

-- Pré-Treino: Ice Nitro SIX → Adicional (múltipla, opcional)
insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Adicional', 'multiple', false, 10
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'pre-treino' and mi.name = 'Ice Nitro SIX'
on conflict do nothing;

-- Hidrate-se: Jungle com Monin → Sabor do xarope PURE (única, obrigatória)
insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Sabor do xarope PURE', 'single', true, 10
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'hidrate-se' and mi.name = 'Jungle com Monin'
on conflict do nothing;

-- Hidrate-se: Ice Tea → Sabor (única, obrigatória)
insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Sabor', 'single', true, 10
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'hidrate-se' and mi.name = 'Ice Tea'
on conflict do nothing;

-- Pós-Treino: Protein SIX → Sabor do xarope Monin (única, obrigatória)
insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Sabor do xarope Monin', 'single', true, 10
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'pos-treino' and mi.name = 'Protein SIX'
on conflict do nothing;

-- Pós-Treino: Protein Vegano → Base (única, obrigatória)
insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Base', 'single', true, 10
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'pos-treino' and mi.name = 'Protein Vegano'
on conflict do nothing;

-- Pós-Treino: Whey Power Daily → Base (única, obrigatória)
insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Base', 'single', true, 10
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'pos-treino' and mi.name = 'Whey Power Daily'
on conflict do nothing;

-- Divirta-se: Cerveja → Versão (única, obrigatória)
insert into bar.option_groups (menu_item_id, name, kind, required, sort_order)
select mi.id, 'Versão', 'single', true, 10
from bar.menu_items mi join bar.categories c on c.id = mi.category_id
where c.slug = 'divirta-se' and mi.name = 'Cerveja'
on conflict do nothing;

-- ═══════════════════════════ Opções ════════════════════════════════

-- Xarope Monin (Hot Latte / Ice Latte)
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, v.name, 0, v.ord
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id,
(values ('Avelã', 10), ('Coco', 20), ('Cookies', 30)) as v(name, ord)
where c.slug = 'cafes' and mi.name in ('Hot Latte', 'Ice Latte') and og.name = 'Xarope Monin'
on conflict do nothing;

-- Ultracoffee: Sabor
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, v.name, 0, v.ord
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id,
(values ('Caramelo', 10), ('Baunilha', 20), ('Chocolate', 30), ('Double Shot', 40)) as v(name, ord)
where c.slug = 'pre-treino' and mi.name in ('Hot Shot Ultracoffee', 'Ice Shot Ultra Coffee') and og.name = 'Sabor'
on conflict do nothing;

-- Ultracoffee: Base
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, v.name, 0, v.ord
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id,
(values ('Água', 10), ('Leite', 20)) as v(name, ord)
where c.slug = 'pre-treino' and mi.name in ('Hot Shot Ultracoffee', 'Ice Shot Ultra Coffee') and og.name = 'Base'
on conflict do nothing;

-- Ice Nitro SIX: Adicional
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, 'Xarope Monin', 0, 10
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id
where c.slug = 'pre-treino' and mi.name = 'Ice Nitro SIX' and og.name = 'Adicional'
on conflict do nothing;

-- Jungle com Monin: Sabor do xarope PURE  (sabores de exemplo — ajuste no /admin)
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, v.name, 0, v.ord
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id,
(values ('Frutas Vermelhas', 10), ('Maracujá (exemplo)', 20), ('Manga (exemplo)', 30)) as v(name, ord)
where c.slug = 'hidrate-se' and mi.name = 'Jungle com Monin' and og.name = 'Sabor do xarope PURE'
on conflict do nothing;

-- Ice Tea: Sabor  (sabores reais do cardápio)
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, v.name, 0, v.ord
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id,
(values ('Hibisco', 10), ('Maçã', 20), ('Limão e Gengibre', 30), ('Maçã com Cranberry', 40)) as v(name, ord)
where c.slug = 'hidrate-se' and mi.name = 'Ice Tea' and og.name = 'Sabor'
on conflict do nothing;

-- Protein SIX: Sabor do xarope Monin  (sabores de exemplo — ajuste no /admin)
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, v.name, 0, v.ord
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id,
(values ('Morango (exemplo)', 10), ('Avelã (exemplo)', 20), ('Coco (exemplo)', 30)) as v(name, ord)
where c.slug = 'pos-treino' and mi.name = 'Protein SIX' and og.name = 'Sabor do xarope Monin'
on conflict do nothing;

-- Protein Vegano: Base
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, v.name, 0, v.ord
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id,
(values ('Leite', 10), ('Água', 20)) as v(name, ord)
where c.slug = 'pos-treino' and mi.name = 'Protein Vegano' and og.name = 'Base'
on conflict do nothing;

-- Whey Power Daily: Base
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, v.name, 0, v.ord
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id,
(values ('Água', 10), ('Leite', 20)) as v(name, ord)
where c.slug = 'pos-treino' and mi.name = 'Whey Power Daily' and og.name = 'Base'
on conflict do nothing;

-- Cerveja: Versão
insert into bar.options (group_id, name, price_delta, sort_order)
select og.id, v.name, 0, v.ord
from bar.option_groups og
  join bar.menu_items mi on mi.id = og.menu_item_id
  join bar.categories c on c.id = mi.category_id,
(values ('Heineken', 10), ('Heineken Zero', 20)) as v(name, ord)
where c.slug = 'divirta-se' and mi.name = 'Cerveja' and og.name = 'Versão'
on conflict do nothing;

-- ═══════════════════════════ Settings ══════════════════════════════
--  Hashes de PIN começam null → configure no primeiro acesso a
--  /bar/login e /admin/login (formulário de "Definir PIN").
insert into bar.settings (key, value, is_public) values
  ('bar_open',            'true'::jsonb, true),
  ('locations',           '["Musculação","Cardio","Área de Lutas","Studio","Recepção","Banheiro feminino","Banheiro masculino","Rooftop"]'::jsonb, true),
  ('alert_minutes',       '8'::jsonb, true),
  ('divirta_manual_date', 'null'::jsonb, true),
  ('bar_pin_hash',        'null'::jsonb, false),
  ('admin_pin_hash',      'null'::jsonb, false)
on conflict (key) do nothing;

commit;
