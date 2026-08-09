'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { ALCOHOL_NOTE } from '@/lib/constants';
import type { CartOptionSelection, MenuItem } from '@/lib/types';
import { useCart } from './cart-context';

export function CustomizationSheet({
  item,
  color,
  onClose,
}: {
  item: MenuItem;
  color: string;
  onClose: () => void;
}) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  // single: groupId -> optionId ; multiple: groupId -> Set(optionId)
  const [single, setSingle] = useState<Record<string, string>>({});
  const [multi, setMulti] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const missingRequired = useMemo(() => {
    return item.option_groups.some((g) => {
      if (g.kind === 'single' && g.required) return !single[g.id];
      if (g.kind === 'multiple' && g.required)
        return (multi[g.id]?.size ?? 0) < 1;
      return false;
    });
  }, [item.option_groups, single, multi]);

  function toggleMulti(groupId: string, optionId: string) {
    setMulti((prev) => {
      const set = new Set(prev[groupId] ?? []);
      if (set.has(optionId)) set.delete(optionId);
      else set.add(optionId);
      return { ...prev, [groupId]: set };
    });
  }

  function confirm() {
    if (missingRequired) return;
    const options: CartOptionSelection[] = [];
    for (const g of item.option_groups) {
      if (g.kind === 'single') {
        const oid = single[g.id];
        if (!oid) continue;
        const opt = g.options.find((o) => o.id === oid);
        if (opt)
          options.push({
            groupId: g.id,
            groupName: g.name,
            optionId: opt.id,
            optionName: opt.name,
            price_delta: Number(opt.price_delta),
          });
      } else {
        for (const oid of multi[g.id] ?? []) {
          const opt = g.options.find((o) => o.id === oid);
          if (opt)
            options.push({
              groupId: g.id,
              groupName: g.name,
              optionId: opt.id,
              optionName: opt.name,
              price_delta: Number(opt.price_delta),
            });
        }
      }
    }
    add({
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      is_alcoholic: item.is_alcoholic,
      options,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Personalizar ${item.name}`}
    >
      <button
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[88dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-surface border border-hairline shadow-soft animate-slide-in flex flex-col">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

        <header className="px-6 pt-4 pb-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <span className="plate-bullet" style={{ color }} />
            <h2 className="font-heading text-xl uppercase tracking-wide text-text-hi">
              {item.name}
            </h2>
          </div>
          {item.description && (
            <p className="mt-1.5 text-sm text-text-mid leading-relaxed">
              {item.description}
            </p>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {item.option_groups.map((g) => (
            <fieldset key={g.id}>
              <legend className="flex items-baseline justify-between w-full mb-3">
                <span className="field-label mb-0">{g.name}</span>
                <span className="text-[0.68rem] uppercase tracking-widest text-text-low">
                  {g.kind === 'single'
                    ? g.required
                      ? 'Escolha 1'
                      : 'Opcional · até 1'
                    : g.required
                      ? 'Escolha 1+'
                      : 'Opcional'}
                </span>
              </legend>

              <div className="space-y-2">
                {g.options.map((o) => {
                  const isSingle = g.kind === 'single';
                  const checked = isSingle
                    ? single[g.id] === o.id
                    : (multi[g.id]?.has(o.id) ?? false);
                  const delta = formatPrice(
                    o.price_delta > 0 ? o.price_delta : null,
                  );
                  return (
                    <label
                      key={o.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition',
                        checked
                          ? 'border-cream/60 bg-cream/[0.07]'
                          : 'border-hairline hover:border-hairline-strong',
                      )}
                    >
                      <input
                        type={isSingle ? 'radio' : 'checkbox'}
                        name={g.id}
                        checked={checked}
                        onChange={() =>
                          isSingle
                            ? setSingle((p) => ({ ...p, [g.id]: o.id }))
                            : toggleMulti(g.id, o.id)
                        }
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          'grid place-items-center h-5 w-5 flex-none rounded-full border-2 transition',
                          checked ? 'border-cream' : 'border-white/25',
                        )}
                      >
                        {checked && <span className="h-2.5 w-2.5 rounded-full bg-cream" />}
                      </span>
                      <span className="flex-1 text-text-hi">{o.name}</span>
                      {delta && (
                        <span className="text-sm text-cream-dim">+ {delta}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {item.is_alcoholic && (
            <p className="text-xs text-strawberry/90 leading-relaxed border-l-2 border-hibiscus/50 pl-3">
              {ALCOHOL_NOTE}
            </p>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-hairline flex items-center gap-3 bg-surface">
          <div className="flex items-center rounded-full border border-hairline-strong">
            <button
              className="h-11 w-11 grid place-items-center text-xl text-text-hi disabled:opacity-30"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="w-8 text-center font-heading text-lg tabular-nums">
              {quantity}
            </span>
            <button
              className="h-11 w-11 grid place-items-center text-xl text-text-hi"
              onClick={() => setQuantity((q) => Math.min(30, q + 1))}
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
          <button
            className="btn-primary flex-1 py-3.5"
            onClick={confirm}
            disabled={missingRequired}
          >
            {missingRequired ? 'Escolha as opções' : 'Adicionar ao pedido'}
          </button>
        </footer>
      </div>
    </div>
  );
}
