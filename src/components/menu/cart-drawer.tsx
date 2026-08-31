'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { ALCOHOL_NOTE } from '@/lib/constants';
import { submitOrder } from '@/lib/actions/orders';
import { useCart } from './cart-context';

const NAME_KEY = 'six_name';
const LOC_KEY = 'six_location';

export function CartDrawer({
  open,
  onClose,
  locations,
  barOpen,
  unitCode,
}: {
  open: boolean;
  onClose: () => void;
  locations: string[];
  barOpen: boolean;
  unitCode: string;
}) {
  const { lines, total, hasAlcohol, setQty, remove, clear } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? '');
    setLocation(localStorage.getItem(LOC_KEY) ?? '');
  }, []);

  useEffect(() => {
    if (open) setError(null);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function submit() {
    setError(null);
    if (!barOpen) {
      setError('O bar está fechado no momento.');
      return;
    }
    if (!name.trim()) return setError('Informe seu nome.');
    if (!location) return setError('Selecione onde você está na academia.');
    if (lines.length === 0) return setError('Seu carrinho está vazio.');

    localStorage.setItem(NAME_KEY, name.trim());
    localStorage.setItem(LOC_KEY, location);

    startTransition(async () => {
      const res = await submitOrder({
        unitCode,
        customerName: name.trim(),
        location,
        notes: notes.trim() || undefined,
        items: lines.map((l) =>
          l.isCustom
            ? { custom: l.name, quantity: l.quantity }
            : {
                itemId: l.itemId,
                quantity: l.quantity,
                optionIds: l.options.map((o) => o.optionId),
              },
        ),
      });
      if (res.ok) {
        clear();
        router.push(`/${unitCode}/pedido/${res.orderId}`);
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 transition',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ink-soft border-l border-hairline shadow-soft transition-transform duration-300 ease-lux',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Seu pedido"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div>
            <p className="eyebrow text-[0.62rem]">Seu pedido</p>
            <h2 className="font-heading text-xl uppercase tracking-wide">Carrinho</h2>
          </div>
          <button
            className="h-10 w-10 grid place-items-center rounded-full border border-hairline text-text-mid hover:text-text-hi"
            onClick={onClose}
            aria-label="Fechar carrinho"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {lines.length === 0 ? (
            <div className="py-16 text-center text-text-low">
              <p className="font-heading uppercase tracking-widest text-sm">
                Carrinho vazio
              </p>
              <p className="mt-2 text-sm">Adicione itens do cardápio.</p>
            </div>
          ) : (
            lines.map((l) => {
              const unit =
                l.price === null
                  ? null
                  : l.price + l.options.reduce((a, o) => a + o.price_delta, 0);
              const linePrice = formatPrice(unit === null ? null : unit * l.quantity);
              return (
                <div key={l.lineId} className="flex gap-3 border-b border-hairline pb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={cn(
                          'font-heading text-text-hi',
                          l.isCustom ? 'normal-case' : 'uppercase tracking-wide',
                        )}
                      >
                        {l.name}
                      </h3>
                      {l.is_alcoholic && <span className="tag-18">+18</span>}
                    </div>
                    {l.isCustom ? (
                      <p className="mt-0.5 text-xs text-cream-dim">Personalizado</p>
                    ) : (
                      l.options.length > 0 && (
                        <p className="mt-0.5 text-xs text-text-mid">
                          {l.options.map((o) => o.optionName).join(' · ')}
                        </p>
                      )
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-hairline-strong">
                        <button
                          className="h-8 w-8 grid place-items-center text-lg disabled:opacity-30"
                          onClick={() => setQty(l.lineId, l.quantity - 1)}
                          aria-label="Diminuir"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums">
                          {l.quantity}
                        </span>
                        <button
                          className="h-8 w-8 grid place-items-center text-lg"
                          onClick={() => setQty(l.lineId, l.quantity + 1)}
                          aria-label="Aumentar"
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="text-xs uppercase tracking-widest text-text-low hover:text-strawberry"
                        onClick={() => remove(l.lineId)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  {linePrice && (
                    <span className="font-heading text-cream tabular-nums text-sm">
                      {linePrice}
                    </span>
                  )}
                </div>
              );
            })
          )}

          {hasAlcohol && lines.length > 0 && (
            <p className="rounded-xl border border-hibiscus/40 bg-hibiscus/10 px-4 py-3 text-xs leading-relaxed text-strawberry">
              {ALCOHOL_NOTE}
            </p>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-hairline px-5 py-4 space-y-3 bg-ink-soft">
            <div>
              <label className="field-label" htmlFor="cart-name">
                Nome *
              </label>
              <input
                id="cart-name"
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como te chamamos?"
                autoComplete="name"
                maxLength={60}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="cart-loc">
                Onde você está? *
              </label>
              <select
                id="cart-loc"
                className="field-input appearance-none"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Selecione o local…</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="cart-notes">
                Observações
              </label>
              <textarea
                id="cart-notes"
                className="field-input resize-none"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sem açúcar, mais gelo…"
                maxLength={300}
              />
            </div>

            {total !== null && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-text-mid text-sm uppercase tracking-widest">
                  Total
                </span>
                <span className="font-heading text-lg text-cream tabular-nums">
                  {formatPrice(total)}
                </span>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-hibiscus/15 border border-hibiscus/40 px-3 py-2 text-sm text-strawberry">
                {error}
              </p>
            )}

            <button
              className="btn-accent w-full py-4"
              onClick={submit}
              disabled={pending || !barOpen}
            >
              {pending ? 'Enviando…' : 'Enviar pedido'}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
