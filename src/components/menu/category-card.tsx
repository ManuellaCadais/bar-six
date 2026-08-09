'use client';

import { cn } from '@/lib/cn';
import type { CategoryWithItems, MenuItem } from '@/lib/types';
import { Ornament } from '@/components/brand';
import { ItemRow } from './item-row';
import { SignatureCard } from './signature-card';

function CreamHeader({ category }: { category: CategoryWithItems }) {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-2.5">
        <span className="plate-bullet" style={{ color: category.color }} />
        <h2 className="category-title text-ink text-lg sm:text-xl">{category.name}</h2>
        <span className="plate-bullet" style={{ color: category.color }} />
      </div>
      {category.subtitle && (
        <p className="mt-1.5 text-[0.68rem] uppercase tracking-[0.24em] text-ink/50">
          {category.subtitle}
        </p>
      )}
      <div className="mx-auto mt-3 h-px w-16 bg-ink/20" />
    </header>
  );
}

export function CategoryCard({
  category,
  onAdd,
}: {
  category: CategoryWithItems;
  onAdd: (item: MenuItem) => void;
}) {
  const unavailable = !category.available_today;

  // Seção assinatura (Drinks Six Health) → card escuro em destaque no topo.
  if (category.is_signature) {
    return (
      <section id={category.slug} className="scroll-mt-24">
        <header className="mb-4 text-center">
          <Ornament className="justify-center" />
          <h2 className="signature-title mt-2 text-3xl sm:text-[2rem] text-cream leading-tight">
            {category.name}
          </h2>
          {category.subtitle && (
            <p className="mt-1 text-[0.68rem] uppercase tracking-[0.3em] text-cream/60">
              {category.subtitle}
            </p>
          )}
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          {category.items.map((it) => (
            <SignatureCard key={it.id} item={it} onAdd={onAdd} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id={category.slug} className="scroll-mt-24">
      <div className="card-cream px-5 sm:px-7 py-6">
        <CreamHeader category={category} />

        {unavailable ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-ink/15 bg-ink/[0.04] px-4 py-4">
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-ink/50" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <rect x="5" y="10.5" width="14" height="9" rx="2" />
              <path d="M8 10.5V8a4 4 0 1 1 8 0v2.5" />
            </svg>
            <p className="text-sm text-ink/70">
              {category.note ?? 'Disponível em dias selecionados.'}
            </p>
          </div>
        ) : (
          <div className="mt-2 divide-y divide-ink/10">
            {category.items.map((it) =>
              it.is_signature ? (
                <div key={it.id} className="py-4">
                  <SignatureCard item={it} onAdd={onAdd} />
                </div>
              ) : (
                <ItemRow
                  key={it.id}
                  item={it}
                  color={category.color}
                  onAdd={onAdd}
                />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}
