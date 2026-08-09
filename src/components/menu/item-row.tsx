'use client';

import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import type { MenuItem } from '@/lib/types';
import { Thumb } from './thumb';

/** Dica curta de personalização: mostra o 1º grupo e algumas opções. */
function primaryHint(item: MenuItem): string | null {
  const g = item.option_groups[0];
  if (!g) return null;
  const names = g.options.map((o) => o.name);
  const shown = names.slice(0, 3).join(' · ');
  return `${g.name}: ${shown}${names.length > 3 ? ' · …' : ''}`;
}

export function ItemRow({
  item,
  color,
  onAdd,
}: {
  item: MenuItem;
  color: string;
  onAdd: (item: MenuItem) => void;
}) {
  const price = formatPrice(item.price);
  const hint = primaryHint(item);
  const hasOptions = item.option_groups.length > 0;

  return (
    <div className="flex gap-3 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-heading text-[1.06rem] font-semibold uppercase tracking-wide text-ink">
            {item.name}
          </h3>
          {item.is_alcoholic && <span className="tag-18">+18</span>}
        </div>

        {item.description && (
          <p className="mt-1 text-[0.82rem] leading-snug text-ink/60">
            {item.description}
          </p>
        )}

        {hint && (
          <p className="mt-1.5 text-[0.72rem] uppercase tracking-wide text-ink/45">
            {hint}
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-3">
          <button
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2',
              'font-heading text-xs uppercase tracking-[0.14em] text-cream',
              'transition active:scale-95 hover:bg-ink-soft',
            )}
            onClick={() => onAdd(item)}
          >
            <span className="text-base leading-none">+</span>
            {hasOptions ? 'Escolher' : 'Adicionar'}
          </button>
          {price && (
            <span className="font-heading text-ink/80 tabular-nums">{price}</span>
          )}
        </div>
      </div>

      {item.image_url && <Thumb item={item} color={color} size="md" />}
    </div>
  );
}
