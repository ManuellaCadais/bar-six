'use client';

import { formatPrice } from '@/lib/format';
import type { MenuItem } from '@/lib/types';
import { Stars } from '@/components/brand';

/**
 * Card diferenciado para itens-assinatura (ex.: SIX Vila Nova, 6 estrelas)
 * e para os itens da seção Drinks Six Health. Serifa itálica + brilho âmbar.
 */
export function SignatureCard({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}) {
  const price = formatPrice(item.price);
  const hasOptions = item.option_groups.length > 0;
  const stars = item.stars ?? 0;

  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-cream/20 p-5 sm:p-6"
      style={{
        background:
          'linear-gradient(165deg, rgba(43,38,32,0.95) 0%, rgba(20,17,14,0.98) 60%), radial-gradient(120% 90% at 85% 0%, rgba(242,169,0,0.16), transparent 55%)',
      }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-40 blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(242,169,0,0.4), transparent 70%)' }}
        aria-hidden
      />

      <div className="relative">
        {stars > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <Stars count={stars} />
            <span className="text-[0.62rem] uppercase tracking-[0.3em] text-cream/70">
              A bebida {stars} estrelas
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <h3 className="signature-title text-2xl sm:text-[1.7rem] text-cream leading-tight">
            {item.name}
          </h3>
          {item.is_alcoholic && <span className="tag-18 mt-1">+18</span>}
        </div>

        {item.description && (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-text-mid">
            {item.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-4">
          <button
            className="btn-primary px-5 py-2.5 text-xs"
            onClick={() => onAdd(item)}
          >
            <span className="text-base leading-none">+</span>
            {hasOptions ? 'Personalizar' : 'Adicionar'}
          </button>
          {price && (
            <span className="font-heading text-cream tabular-nums">{price}</span>
          )}
        </div>
      </div>
    </article>
  );
}
