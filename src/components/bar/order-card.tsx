'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { displayCode } from '@/lib/format';
import { formatElapsed, minutesSince } from '@/lib/datetime';
import { NEXT_STATUS_LABEL, STATUS_META } from '@/lib/constants';
import type { Order } from '@/lib/types';

const STATUS_STYLE: Record<string, string> = {
  recebido: 'border-cream/40 text-cream',
  preparo: 'border-mango/60 text-mango',
  pronto: 'border-strawberry/70 text-strawberry',
};

export function OrderCard({
  order,
  now,
  alertMinutes,
  pending,
  onAdvance,
  onRevert,
  onCancel,
}: {
  order: Order;
  now: Date;
  alertMinutes: number;
  pending: boolean;
  onAdvance: (id: string) => void;
  onRevert: (id: string) => void;
  onCancel: (id: string, reason: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  const mins = minutesSince(order.created_at, now);
  const overdue = mins >= alertMinutes;
  const advanceLabel = NEXT_STATUS_LABEL[order.status];

  return (
    <article
      className={cn(
        'rounded-2xl border bg-surface/90 shadow-card overflow-hidden',
        overdue ? 'border-hibiscus/60' : 'border-hairline',
      )}
    >
      {overdue && <div className="h-1 w-full bg-hibiscus" />}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-2xl uppercase tracking-wide text-text-hi">
                {displayCode(order.short_code)}
              </h3>
              <span
                className={cn(
                  'chip border text-[0.62rem] uppercase tracking-widest',
                  STATUS_STYLE[order.status] ?? 'border-hairline text-text-mid',
                )}
              >
                {STATUS_META[order.status].short}
              </span>
            </div>
            <p className="mt-1 text-lg text-text-hi">{order.customer_name}</p>
            <p className="text-sm text-cream-dim">{order.location}</p>
          </div>

          <div className="text-right">
            <p
              className={cn(
                'font-heading text-2xl tabular-nums',
                overdue ? 'text-hibiscus' : 'text-text-mid',
              )}
              suppressHydrationWarning
            >
              {formatElapsed(order.created_at, now)}
            </p>
            <p className="text-[0.6rem] uppercase tracking-widest text-text-low">
              {overdue ? 'atrasado' : 'na fila'}
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2 border-t border-hairline pt-3">
          {order.order_items?.map((it) => (
            <li key={it.id} className="text-[0.98rem] leading-snug">
              <span className="text-cream font-heading tabular-nums">
                {it.quantity}×
              </span>{' '}
              <span className="text-text-hi">{it.item_name}</span>
              {it.selected_options.length > 0 && (
                <span className="text-text-mid">
                  {' '}
                  — {it.selected_options.map((o) => o.option).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="mt-3 rounded-lg border border-mango/40 bg-mango/10 px-3 py-2 text-sm text-mango">
            Obs.: {order.notes}
          </p>
        )}

        {/* Ações */}
        {cancelling ? (
          <div className="mt-4 space-y-2">
            <input
              className="field-input"
              placeholder="Motivo do cancelamento (aparece para o aluno)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
              maxLength={200}
            />
            <div className="flex gap-2">
              <button
                className="btn-danger flex-1 py-3"
                disabled={pending}
                onClick={() => {
                  onCancel(order.id, reason);
                  setCancelling(false);
                  setReason('');
                }}
              >
                Confirmar cancelamento
              </button>
              <button
                className="btn-ghost px-5 py-3"
                onClick={() => setCancelling(false)}
              >
                Voltar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-stretch gap-2">
            {advanceLabel && (
              <button
                className="btn-primary flex-1 min-h-[3.5rem] text-sm"
                disabled={pending}
                onClick={() => onAdvance(order.id)}
              >
                {advanceLabel}
              </button>
            )}
            <button
              className="btn-ghost min-h-[3.5rem] px-4 text-xs"
              disabled={pending}
              onClick={() => setCancelling(true)}
              aria-label="Cancelar pedido"
            >
              Cancelar
            </button>
            {order.status !== 'recebido' && (
              <button
                className="btn-ghost min-h-[3.5rem] px-3 text-xs"
                disabled={pending}
                onClick={() => onRevert(order.id)}
                aria-label="Voltar um passo"
                title="Voltar um passo"
              >
                ↩
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
