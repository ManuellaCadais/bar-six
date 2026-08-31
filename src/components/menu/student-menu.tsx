'use client';

import { useMemo, useState } from 'react';
import type { CategoryWithItems, MenuItem, PublicSettings } from '@/lib/types';
import { isProteinOfDayCurrent } from '@/lib/availability';
import { CartProvider, useCart } from './cart-context';
import { CategoryCard } from './category-card';
import { CustomizationSheet } from './customization-sheet';
import { CustomOrderSheet } from './custom-order-sheet';
import { CartDrawer } from './cart-drawer';

export function StudentMenu({
  menu,
  settings,
  unitCode,
  unitName,
}: {
  menu: CategoryWithItems[];
  settings: PublicSettings;
  unitCode: string;
  unitName: string;
}) {
  return (
    <CartProvider>
      <MenuShell menu={menu} settings={settings} unitCode={unitCode} unitName={unitName} />
    </CartProvider>
  );
}

function MenuShell({
  menu,
  settings,
  unitCode,
  unitName,
}: {
  menu: CategoryWithItems[];
  settings: PublicSettings;
  unitCode: string;
  unitName: string;
}) {
  const { add } = useCart();
  const [sheet, setSheet] = useState<{ item: MenuItem; color: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const colorByItem = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of menu) for (const it of c.items) m.set(it.id, c.color);
    return m;
  }, [menu]);

  const visible = useMemo(
    () => menu.filter((c) => (c.available_today ? c.items.length > 0 : true)),
    [menu],
  );

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 1800);
  }

  function onAdd(item: MenuItem) {
    if (item.option_groups.length > 0) {
      const color = colorByItem.get(item.id) ?? '#E9DCC3';
      setSheet({ item, color });
    } else {
      add({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        is_alcoholic: item.is_alcoholic,
        options: [],
      });
      flash(`${item.name} adicionado`);
    }
  }

  const proteinFlavor = isProteinOfDayCurrent(settings.protein_of_day)
    ? settings.protein_of_day!.flavor
    : null;

  return (
    <div className="min-h-dvh pb-28">
      <Header barOpen={settings.bar_open} proteinFlavor={proteinFlavor} unitName={unitName} />

      {visible.length > 0 && <CategoryNav categories={visible} />}

      <main className="mx-auto w-full max-w-2xl px-4 sm:px-5 space-y-8 mt-6">
        {visible.map((c) => (
          <CategoryCard key={c.id} category={c} onAdd={onAdd} />
        ))}

        <CustomOrderTrigger onOpen={() => setCustomOpen(true)} />
      </main>

      <Footer />

      <FloatingCartBar onOpen={() => setDrawerOpen(true)} />

      {sheet && (
        <CustomizationSheet
          item={sheet.item}
          color={sheet.color}
          onClose={() => setSheet(null)}
        />
      )}

      {customOpen && <CustomOrderSheet onClose={() => setCustomOpen(false)} />}

      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locations={settings.locations}
        barOpen={settings.bar_open}
        unitCode={unitCode}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 animate-fade-up">
          <div className="rounded-full bg-cream px-5 py-2.5 text-sm font-heading uppercase tracking-widest text-ink shadow-glow">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function Header({
  barOpen,
  proteinFlavor,
  unitName,
}: {
  barOpen: boolean;
  proteinFlavor: string | null;
  unitName: string;
}) {
  return (
    <header className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-2xl px-4 pt-8 pb-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/six-logo.png"
          alt="SIX Wowness Club"
          className="mx-auto h-24 w-24 object-contain drop-shadow-sm sm:h-28 sm:w-28"
        />
        <p className="eyebrow mt-4 text-[0.62rem]">
          Wowness Club · Cardápio{unitName ? ` · ${unitName}` : ''}
        </p>
        <p className="mt-3 text-sm text-text-mid max-w-sm mx-auto text-balance">
          Escaneou, escolheu, enviou. Seu pedido chega ao bar na hora — acompanhe
          pelo celular.
        </p>

        {proteinFlavor && (
          <div className="card-cream mx-auto mt-5 inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-glow">
            <span className="plate-bullet text-ink/55" />
            <span className="font-heading text-xs uppercase tracking-wide text-ink/70">
              Proteína do dia
            </span>
            <span className="font-heading text-sm font-semibold uppercase tracking-wide text-ink">
              {proteinFlavor}
            </span>
          </div>
        )}

        {!barOpen && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-hibiscus/45 bg-hibiscus/10 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-hibiscus" />
            <span className="text-sm text-strawberry">
              Bar fechado no momento — pedidos indisponíveis.
            </span>
          </div>
        )}
      </div>
      <div className="mx-auto max-w-2xl px-4">
        <div className="hairline" />
      </div>
    </header>
  );
}

function CustomOrderTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="surface-card border-dashed px-6 py-6 text-center">
      <p className="font-heading text-sm uppercase tracking-[0.16em] text-text-hi">
        Não achou o que quer?
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-mid">
        Peça do seu jeito — um shake diferente, água, isotônico, energético, o
        que for. Escreva e o bar prepara.
      </p>
      <button className="btn-ghost mt-4 px-5 py-2.5 text-xs" onClick={onOpen}>
        Personalizar pedido
      </button>
    </section>
  );
}

function CategoryNav({ categories }: { categories: CategoryWithItems[] }) {
  return (
    <nav className="sticky top-0 z-20 border-b border-hairline bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {categories.map((c) => (
          <a
            key={c.id}
            href={`#${c.slug}`}
            className="flex-none rounded-full border border-hairline px-3.5 py-1.5 text-xs uppercase tracking-widest text-text-mid hover:border-cream/50 hover:text-text-hi transition whitespace-nowrap"
          >
            {c.name}
          </a>
        ))}
      </div>
    </nav>
  );
}

function FloatingCartBar({ onOpen }: { onOpen: () => void }) {
  const { count, total } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 p-4">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={onOpen}
          className="btn-primary w-full py-4 shadow-soft flex items-center justify-between px-6"
        >
          <span className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-cream text-xs tabular-nums">
              {count}
            </span>
            Ver pedido
          </span>
          <span className="tabular-nums">
            {total !== null
              ? new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(total)
              : 'Enviar →'}
          </span>
        </button>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto mt-12 w-full max-w-2xl px-4 pb-10 text-center">
      <div className="hairline mb-6" />
      <p className="text-xs uppercase tracking-[0.2em] text-text-low">
        Análise nutricional
      </p>
      <p className="mt-1 text-sm text-text-mid">
        Dr. Leandro Vaz — Médico do Esporte e Nutrólogo
      </p>
      <div className="mt-4 flex items-center justify-center gap-5 text-sm">
        <a
          href="https://instagram.com/sixhealth.br"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cream/80 hover:text-cream transition"
        >
          @sixhealth.br
        </a>
        <span className="text-text-low">·</span>
        <a
          href="https://instagram.com/sixwownessbar"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cream/80 hover:text-cream transition"
        >
          @sixwownessbar
        </a>
      </div>
    </footer>
  );
}
