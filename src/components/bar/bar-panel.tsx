'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useNow } from '@/lib/use-now';
import { formatBarTime } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import { Seal } from '@/components/brand';
import {
  advanceOrderStatus,
  revertOrderStatus,
  cancelOrder,
  setBarOpen,
  liberateDivirtaToday,
  clearDivirtaLiberation,
} from '@/lib/actions/bar';
import { logout } from '@/lib/actions/auth';
import type { CategoryWithItems, Order, OrderStatus } from '@/lib/types';
import { OrderCard } from './order-card';
import { MenuControl } from './menu-control';

const ACTIVE: OrderStatus[] = ['recebido', 'preparo', 'pronto'];

function playChime(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  const notes: [number, number][] = [
    [880, 0],
    [1174.66, 0.14],
  ];
  for (const [freq, offset] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.28, t0 + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.55);
  }
}

export function BarPanel({
  initialOrders,
  menu,
  barOpen: barOpenInitial,
  alertMinutes,
  divirtaDate,
  todayDate,
}: {
  initialOrders: Order[];
  menu: CategoryWithItems[];
  barOpen: boolean;
  alertMinutes: number;
  divirtaDate: string | null;
  todayDate: string;
}) {
  const now = useNow(1000);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [barOpen, setBarOpenState] = useState(barOpenInitial);
  const [divirta, setDivirta] = useState<string | null>(divirtaDate);
  const [soundOn, setSoundOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState(false);
  const [, startTransition] = useTransition();

  const audioRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);

  const upsert = useCallback((order: Order) => {
    setOrders((prev) => {
      const i = prev.findIndex((o) => o.id === order.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = order;
        return copy;
      }
      return [...prev, order];
    });
  }, []);

  const fetchOrder = useCallback(async (id: string): Promise<Order | null> => {
    const sb = getBrowserClient();
    const { data } = await sb
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .maybeSingle();
    return (data as Order) ?? null;
  }, []);

  // Realtime da fila
  useEffect(() => {
    const sb = getBrowserClient();
    const channel = sb
      .channel('bar-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          const order = await fetchOrder((payload.new as { id: string }).id);
          if (order) {
            upsert(order);
            if (soundOnRef.current && audioRef.current) {
              try {
                playChime(audioRef.current);
              } catch {
                /* ignore */
              }
            }
            setFlash(true);
            window.setTimeout(() => setFlash(false), 900);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        async (payload) => {
          const order = await fetchOrder((payload.new as { id: string }).id);
          if (order) upsert(order);
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) setOrders((prev) => prev.filter((o) => o.id !== id));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [fetchOrder, upsert]);

  function enableSound() {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!audioRef.current) audioRef.current = new Ctx();
      audioRef.current.resume();
      playChime(audioRef.current);
      soundOnRef.current = true;
      setSoundOn(true);
    } catch {
      /* áudio indisponível */
    }
  }

  function withPending(id: string, fn: () => Promise<void>) {
    setPendingIds((p) => new Set(p).add(id));
    startTransition(async () => {
      await fn();
      setPendingIds((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    });
  }

  function onAdvance(id: string) {
    withPending(id, async () => {
      const r = await advanceOrderStatus(id);
      if (r.ok && r.status)
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: r.status! } : o)),
        );
    });
  }
  function onRevert(id: string) {
    withPending(id, async () => {
      const r = await revertOrderStatus(id);
      if (r.ok && r.status)
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: r.status! } : o)),
        );
    });
  }
  function onCancel(id: string, reason: string) {
    withPending(id, async () => {
      const r = await cancelOrder(id, reason);
      if (r.ok)
        setOrders((prev) =>
          prev.map((o) =>
            o.id === id
              ? { ...o, status: 'cancelado', cancel_reason: reason || 'Cancelado pelo bar.' }
              : o,
          ),
        );
    });
  }

  function toggleBar() {
    startTransition(async () => {
      const r = await setBarOpen(!barOpen);
      if (r.ok) setBarOpenState(r.open);
    });
  }
  function toggleDivirta() {
    startTransition(async () => {
      if (divirta === todayDate) {
        const r = await clearDivirtaLiberation();
        if (r.ok) setDivirta(null);
      } else {
        const r = await liberateDivirtaToday();
        if (r.ok) setDivirta(r.date);
      }
    });
  }

  const active = useMemo(
    () =>
      orders
        .filter((o) => ACTIVE.includes(o.status))
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    [orders],
  );
  const history = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'entregue' || o.status === 'cancelado')
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [orders],
  );

  const stats = useMemo(() => {
    const delivered = history.filter((o) => o.status === 'entregue').length;
    const cancelled = history.filter((o) => o.status === 'cancelado').length;
    const counts = new Map<string, number>();
    for (const o of orders) {
      if (o.status === 'cancelado') continue;
      for (const it of o.order_items ?? [])
        counts.set(it.item_name, (counts.get(it.item_name) ?? 0) + it.quantity);
    }
    const top = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return { total: orders.length, delivered, cancelled, top };
  }, [orders, history]);

  const divirtaOn = divirta === todayDate;

  return (
    <div className={cn('min-h-dvh transition-colors', flash && 'bg-mango/[0.06]')}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Seal className="h-9 w-9 text-cream/80" />
            <div>
              <p className="eyebrow text-[0.55rem]">Painel do Bar</p>
              <p className="font-heading text-lg uppercase leading-none tracking-wide">
                {formatBarTime(now.toISOString())}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleBar}
              className={cn(
                'chip border px-3 py-2 text-xs uppercase tracking-widest transition',
                barOpen
                  ? 'border-cream/50 text-cream'
                  : 'border-hibiscus/60 text-strawberry',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  barOpen ? 'bg-cream' : 'bg-hibiscus',
                )}
              />
              {barOpen ? 'Bar aberto' : 'Bar fechado'}
            </button>

            <button
              onClick={toggleDivirta}
              className={cn(
                'chip border px-3 py-2 text-xs uppercase tracking-widest transition',
                divirtaOn ? 'border-hibiscus text-hibiscus' : 'border-hairline text-text-mid',
              )}
              title="Libera a categoria Divirta-se hoje (feriados)"
            >
              {divirtaOn ? '✓ Divirta-se liberada' : 'Liberar Divirta-se hoje'}
            </button>

            <button
              onClick={enableSound}
              className={cn(
                'chip border px-3 py-2 text-xs uppercase tracking-widest',
                soundOn ? 'border-cream/50 text-cream' : 'border-mango/60 text-mango',
              )}
            >
              {soundOn ? '♪ Som ativo' : '⚠ Ativar som'}
            </button>

            <button
              onClick={() => setMenuOpen(true)}
              className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi"
            >
              Itens
            </button>
            <Link
              href="/admin"
              className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi"
            >
              Admin
            </Link>
            <form action={logout}>
              <button className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Stats do dia */}
      <div className="mx-auto max-w-7xl px-4 pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <Stat label="Na fila" value={active.length} accent />
          <Stat label="Entregues" value={stats.delivered} />
          <Stat label="Cancelados" value={stats.cancelled} />
          <Stat label="Total do dia" value={stats.total} />
          {stats.top.length > 0 && (
            <div className="ml-auto text-right">
              <p className="text-[0.6rem] uppercase tracking-widest text-text-low">
                Mais pedidos hoje
              </p>
              <p className="text-sm text-text-mid">
                {stats.top.map((t) => `${t.name} (${t.count})`).join(' · ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fila */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {!soundOn && (
          <p className="mb-4 rounded-lg border border-mango/40 bg-mango/10 px-4 py-2 text-sm text-mango">
            Toque em <strong>Ativar som</strong> para ouvir o alerta de novos pedidos.
          </p>
        )}

        {active.length === 0 ? (
          <div className="grid place-items-center py-24 text-center">
            <Seal className="h-16 w-16 text-cream/25" />
            <p className="mt-4 font-heading uppercase tracking-widest text-text-low">
              Nenhum pedido na fila
            </p>
            <p className="mt-1 text-sm text-text-low">
              Novos pedidos aparecem aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                now={now}
                alertMinutes={alertMinutes}
                pending={pendingIds.has(o.id)}
                onAdvance={onAdvance}
                onRevert={onRevert}
                onCancel={onCancel}
              />
            ))}
          </div>
        )}

        {/* Histórico do dia */}
        {history.length > 0 && (
          <details className="mt-10 group">
            <summary className="cursor-pointer list-none font-heading uppercase tracking-widest text-text-mid hover:text-text-hi">
              <span className="inline-flex items-center gap-2">
                <span className="transition group-open:rotate-90">›</span>
                Histórico do dia ({history.length})
              </span>
            </summary>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {history.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-hairline bg-surface/60 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading uppercase tracking-wide text-text-hi">
                      #{o.short_code}
                    </span>
                    <span
                      className={cn(
                        'text-[0.62rem] uppercase tracking-widest',
                        o.status === 'entregue' ? 'text-cream' : 'text-strawberry',
                      )}
                    >
                      {o.status === 'entregue' ? 'Entregue' : 'Cancelado'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-text-mid">
                    {o.customer_name} · {o.location} · {formatBarTime(o.created_at)}
                  </p>
                  {o.status === 'cancelado' && o.cancel_reason && (
                    <p className="mt-1 text-xs text-strawberry/80">{o.cancel_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </main>

      <MenuControl open={menuOpen} onClose={() => setMenuOpen(false)} menu={menu} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-2.5 min-w-[6rem]',
        accent ? 'border-cream/40 bg-cream/[0.06]' : 'border-hairline',
      )}
    >
      <p className="text-[0.6rem] uppercase tracking-widest text-text-low">{label}</p>
      <p
        className={cn(
          'font-heading text-2xl tabular-nums leading-none mt-1',
          accent ? 'text-cream' : 'text-text-hi',
        )}
      >
        {value}
      </p>
    </div>
  );
}
