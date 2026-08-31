'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';
import { STATUS_FLOW, STATUS_META } from '@/lib/constants';
import { displayCode, formatPrice } from '@/lib/format';
import { formatBarTime } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import { Seal } from '@/components/brand';
import type { Order } from '@/lib/types';

/** Anilha que representa uma etapa do pedido. */
function StatusPlate({
  state,
}: {
  state: 'done' | 'active' | 'pending';
}) {
  return (
    <span
      className={cn(
        'relative grid h-11 w-11 flex-none place-items-center rounded-full border-[3px] transition-all duration-300',
        state === 'done' && 'border-cream bg-cream/15 text-cream',
        state === 'active' && 'border-mango bg-mango/15 text-mango animate-pulse-ready',
        state === 'pending' && 'border-white/15 text-white/25',
      )}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
    </span>
  );
}

export function OrderTracker({ initial, unitCode }: { initial: Order; unitCode: string }) {
  const [order, setOrder] = useState<Order>(initial);
  const prevStatus = useRef(initial.status);

  // Realtime: escuta mudanças de status deste pedido.
  useEffect(() => {
    const sb = getBrowserClient();
    const channel = sb
      .channel(`order-${initial.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'bar',
          table: 'orders',
          filter: `id=eq.${initial.id}`,
        },
        (payload) => {
          setOrder((prev) => ({ ...prev, ...(payload.new as Order) }));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [initial.id]);

  // Vibração ao ficar "Pronto".
  useEffect(() => {
    if (order.status !== prevStatus.current) {
      if (
        order.status === 'pronto' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.vibrate === 'function'
      ) {
        navigator.vibrate([130, 70, 130, 70, 260]);
      }
      prevStatus.current = order.status;
    }
  }, [order.status]);

  const cancelled = order.status === 'cancelado';
  const ready = order.status === 'pronto';
  const delivered = order.status === 'entregue';
  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const meta = STATUS_META[order.status];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-8">
      <header className="text-center">
        <Seal className="mx-auto h-12 w-12 text-cream/70" />
        <p className="eyebrow mt-3 text-[0.6rem]">Acompanhe seu pedido</p>
        <h1 className="mt-1 font-heading text-3xl uppercase tracking-wide">
          {displayCode(order.short_code)}
        </h1>
      </header>

      {/* Banner de estado */}
      <div
        className={cn(
          'mt-6 rounded-2xl border px-6 py-6 text-center transition-all duration-500',
          ready && 'border-mango bg-mango text-ink animate-pulse-ready',
          delivered && 'border-cream/40 bg-cream/10',
          cancelled && 'border-hibiscus/50 bg-hibiscus/15',
          !ready && !delivered && !cancelled && 'border-hairline bg-surface/70',
        )}
      >
        <p
          className={cn(
            'font-heading text-3xl uppercase tracking-wide',
            ready ? 'text-ink' : cancelled ? 'text-strawberry' : 'text-text-hi',
          )}
        >
          {meta.label}
        </p>
        <p className={cn('mt-1 text-sm', ready ? 'text-ink/70' : 'text-text-mid')}>
          {cancelled && order.cancel_reason ? order.cancel_reason : meta.hint}
        </p>
      </div>

      {/* Stepper (oculto se cancelado) */}
      {!cancelled && (
        <ol className="mt-8 space-y-1">
          {STATUS_FLOW.map((s, i) => {
            const state =
              i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending';
            const isLast = i === STATUS_FLOW.length - 1;
            return (
              <li key={s} className="flex items-stretch gap-4">
                <div className="flex flex-col items-center">
                  <StatusPlate state={state} />
                  {!isLast && (
                    <span
                      className={cn(
                        'w-[3px] flex-1 my-1 rounded-full transition-colors',
                        i < currentIndex ? 'bg-cream/60' : 'bg-white/10',
                      )}
                    />
                  )}
                </div>
                <div className={cn('pb-6 pt-1.5', isLast && 'pb-0')}>
                  <p
                    className={cn(
                      'font-heading uppercase tracking-wide',
                      state === 'pending' ? 'text-text-low' : 'text-text-hi',
                    )}
                  >
                    {STATUS_META[s].label}
                  </p>
                  <p className="text-xs text-text-mid">{STATUS_META[s].hint}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Resumo do pedido */}
      <section className="mt-8 surface-card p-5">
        <h2 className="eyebrow text-[0.6rem]">Resumo</h2>
        <ul className="mt-3 divide-y divide-hairline">
          {order.order_items?.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3 py-2.5">
              <div>
                <p className="text-text-hi">
                  <span className="text-cream tabular-nums">{it.quantity}×</span>{' '}
                  {it.item_name}
                </p>
                {it.selected_options.length > 0 && (
                  <p className="text-xs text-text-mid">
                    {it.selected_options.map((o) => o.option).join(' · ')}
                  </p>
                )}
              </div>
              {it.unit_price !== null && (
                <span className="text-sm text-text-mid tabular-nums">
                  {formatPrice(it.unit_price * it.quantity)}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-mid">
          <span>
            <span className="text-text-low">Nome:</span> {order.customer_name}
          </span>
          <span>
            <span className="text-text-low">Local:</span> {order.location}
          </span>
          <span>
            <span className="text-text-low">Horário:</span>{' '}
            {formatBarTime(order.created_at)}
          </span>
        </div>
        {order.notes && (
          <p className="mt-2 text-sm text-text-mid">
            <span className="text-text-low">Obs.:</span> {order.notes}
          </p>
        )}
        {order.total !== null && (
          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
            <span className="text-sm uppercase tracking-widest text-text-mid">Total</span>
            <span className="font-heading text-lg text-cream tabular-nums">
              {formatPrice(order.total)}
            </span>
          </div>
        )}
      </section>

      <div className="mt-6 text-center">
        <Link
          href={`/${unitCode}`}
          className="text-sm uppercase tracking-widest text-text-mid hover:text-cream transition"
        >
          ← Voltar ao cardápio
        </Link>
      </div>
    </div>
  );
}
