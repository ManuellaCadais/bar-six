'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useNow } from '@/lib/use-now';
import { formatElapsed } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import { Seal } from '@/components/brand';
import { logout } from '@/lib/actions/auth';
import { createDriverTicket, searchHistory, setValetEnabled } from '@/lib/actions/valet';
import { UnitSwitcher } from '@/components/unit-switcher';
import type { UnitOption } from '@/lib/session';
import {
  ACTIVE_STATUSES,
  STATUS_META,
  TICKET_COLUMNS,
  formatPlate,
  normalizePlate,
  type ValetTicket,
} from '@/lib/valet/constants';
import { TicketSheet } from './ticket-sheet';

function playChime(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  for (const [freq, offset] of [
    [660, 0],
    [880, 0.16],
    [660, 0.32],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, t0 + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.45);
  }
}

/** Remove campos que não pertencem à tela (o payload do realtime traz a linha inteira). */
function toTicket(row: Record<string, unknown>): ValetTicket {
  const { public_token: _t, checkin_by: _a, checkout_by: _b, delivered_by: _c, ...rest } = row;
  return rest as unknown as ValetTicket;
}

export function ValetPanel({
  initialTickets,
  enabled: enabledInitial,
  unitId,
  unitName,
  availableUnits,
  canManage,
}: {
  initialTickets: ValetTicket[];
  enabled: boolean;
  unitId: string;
  unitName: string;
  availableUnits: UnitOption[] | null;
  canManage: boolean;
}) {
  const now = useNow(1000);
  const [tickets, setTickets] = useState<ValetTicket[]>(initialTickets);
  const [enabled, setEnabled] = useState(enabledInitial);
  const [tab, setTab] = useState<'operacao' | 'historico'>('operacao');
  const [openId, setOpenId] = useState<string | null>(null);
  const [historyTicket, setHistoryTicket] = useState<ValetTicket | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('');
  const [soundOn, setSoundOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const audioRef = useRef<AudioContext | null>(null);

  const upsert = useCallback((t: ValetTicket) => {
    setTickets((prev) => {
      const i = prev.findIndex((x) => x.id === t.id);
      if (i < 0) return [...prev, t];
      const copy = [...prev];
      copy[i] = t;
      return copy;
    });
  }, []);

  // Recarrega a fila inteira — usado quando o celular volta do bloqueio/sem
  // internet, momento em que o realtime pode ter perdido eventos.
  const reload = useCallback(async () => {
    const sb = getBrowserClient().schema('valet');
    const { data } = await sb
      .from('tickets')
      .select(TICKET_COLUMNS)
      .eq('unit_id', unitId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true });
    if (data) {
      setTickets((prev) => [
        ...(data as ValetTicket[]),
        ...prev.filter((t) => !ACTIVE_STATUSES.includes(t.status)),
      ]);
    }
  }, [unitId]);

  useEffect(() => {
    const sb = getBrowserClient();
    const channel = sb
      .channel(`valet-tickets-${unitId}`)
      .on('postgres_changes', { event: '*', schema: 'valet', table: 'tickets' }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (!row || row.unit_id !== unitId) return;
        const t = toTicket(row);
        if (payload.eventType === 'INSERT' || t.status === 'solicitado') {
          setFlash(true);
          window.setTimeout(() => setFlash(false), 900);
        }
        upsert(t);
      })
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', reload);
    return () => {
      sb.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', reload);
    };
  }, [unitId, upsert, reload]);

  const groups = useMemo(() => {
    const term = normalizePlate(filter);
    const byTime = (key: keyof ValetTicket) => (a: ValetTicket, b: ValetTicket) =>
      new Date((a[key] as string) ?? a.created_at).getTime() - new Date((b[key] as string) ?? b.created_at).getTime();
    return {
      retiradas: tickets
        .filter((t) => ['solicitado', 'buscando', 'pronto'].includes(t.status))
        .sort(byTime('requested_at')),
      chegando: tickets.filter((t) => t.status === 'aguardando').sort(byTime('created_at')),
      estacionados: tickets
        .filter((t) => t.status === 'estacionado')
        .filter((t) => !term || t.plate.includes(term) || t.code.includes(term))
        .sort(byTime('checked_in_at')),
      finalizados: tickets
        .filter((t) => t.status === 'entregue' || t.status === 'cancelado')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    };
  }, [tickets, filter]);

  // Alarme: enquanto houver carro chegando ou pedido de retirada sem ninguém buscando.
  const needsAttention = groups.chegando.length > 0 || groups.retiradas.some((t) => t.status === 'solicitado');
  useEffect(() => {
    if (!needsAttention || !soundOn || !audioRef.current) return;
    const ctx = audioRef.current;
    const ring = () => {
      try {
        playChime(ctx);
      } catch {
        /* ignore */
      }
    };
    ring();
    const id = window.setInterval(ring, 5000);
    return () => window.clearInterval(id);
  }, [needsAttention, soundOn]);

  function enableSound() {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioRef.current) audioRef.current = new Ctx();
      audioRef.current.resume();
      playChime(audioRef.current);
      setSoundOn(true);
    } catch {
      /* áudio indisponível */
    }
  }

  function toggleEnabled() {
    start(async () => {
      const r = await setValetEnabled(!enabled);
      if (r.ok) setEnabled(r.enabled);
      else setError(r.message);
    });
  }

  const openTicket = tickets.find((t) => t.id === openId) ?? null;

  return (
    <div className={cn('min-h-dvh pb-16 transition-colors', flash && 'bg-mango/10')}>
      <header className="sticky top-0 z-20 border-b border-hairline bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Seal className="h-9 w-9 text-cream/80" />
            <div>
              <p className="eyebrow text-[0.55rem]">
                Painel do Valet{!availableUnits && <span className="text-cream/70"> · {unitName}</span>}
              </p>
              <p className="font-heading text-lg uppercase leading-none tracking-wide">SIX Valet</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {availableUnits && <UnitSwitcher current={unitId} units={availableUnits} />}
            <button
              onClick={enableSound}
              disabled={soundOn}
              className={cn(
                'chip border px-3 py-2 text-xs uppercase tracking-widest disabled:opacity-100',
                soundOn ? 'border-cream/50 text-cream' : 'border-mango/60 text-mango animate-pulse-ready',
              )}
            >
              {soundOn ? '♪ Som ativo' : 'Ativar som'}
            </button>
            <Link
              href="/equipe"
              className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi"
            >
              Início
            </Link>
            <form action={logout}>
              <button className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi">
                Sair
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 pb-3">
          {(['operacao', 'historico'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs uppercase tracking-widest transition',
                tab === t ? 'bg-cream text-ink' : 'border border-hairline text-text-mid hover:text-text-hi',
              )}
            >
              {t === 'operacao' ? 'Operação' : 'Histórico'}
            </button>
          ))}
          <button onClick={() => setCreating(true)} className="btn-primary ml-auto px-4 py-2 text-xs">
            + Carro
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5">
        {!enabled && (
          <div className="rounded-xl border border-mango/50 bg-mango/10 px-4 py-3 text-sm text-text-hi">
            <strong className="text-mango">Valet desligado nesta unidade.</strong> Os alunos não veem a opção
            "Valet" no QR Code. O painel funciona normalmente pra testes.
            {canManage && (
              <button onClick={toggleEnabled} className="btn-primary ml-3 mt-2 px-4 py-1.5 text-xs sm:mt-0">
                Ligar valet
              </button>
            )}
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-hibiscus/40 bg-hibiscus/15 px-3 py-2 text-sm text-strawberry">{error}</p>
        )}

        {tab === 'operacao' ? (
          <>
            <Section title="Pedidos de retirada" count={groups.retiradas.length} highlight>
              {groups.retiradas.map((t) => (
                <TicketCard key={t.id} t={t} now={now} onOpen={() => setOpenId(t.id)} />
              ))}
            </Section>

            <Section title="Chegando" count={groups.chegando.length}>
              {groups.chegando.map((t) => (
                <TicketCard key={t.id} t={t} now={now} onOpen={() => setOpenId(t.id)} />
              ))}
            </Section>

            <Section
              title="Estacionados"
              count={tickets.filter((t) => t.status === 'estacionado').length}
              action={
                <input
                  className="field-input w-40 py-1.5 text-sm"
                  placeholder="Placa ou código"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              }
            >
              {groups.estacionados.map((t) => (
                <TicketCard key={t.id} t={t} now={now} onOpen={() => setOpenId(t.id)} />
              ))}
            </Section>

            {groups.finalizados.length > 0 && (
              <Section title="Finalizados hoje" count={groups.finalizados.length}>
                {groups.finalizados.map((t) => (
                  <TicketCard key={t.id} t={t} now={now} onOpen={() => setOpenId(t.id)} muted />
                ))}
              </Section>
            )}

            {canManage && enabled && (
              <div className="border-t border-hairline pt-4 text-right">
                <button onClick={toggleEnabled} className="text-xs uppercase tracking-widest text-text-low hover:text-strawberry">
                  Desligar valet desta unidade
                </button>
              </div>
            )}
          </>
        ) : (
          <HistoryTab now={now} onOpen={setHistoryTicket} />
        )}
      </main>

      {openTicket && (
        <TicketSheet ticket={openTicket} onClose={() => setOpenId(null)} onTicket={upsert} />
      )}
      {historyTicket && (
        <TicketSheet
          ticket={historyTicket}
          onClose={() => setHistoryTicket(null)}
          onTicket={(t) => {
            setHistoryTicket(t);
            upsert(t);
          }}
        />
      )}
      {creating && (
        <NewTicketSheet
          onClose={() => setCreating(false)}
          onCreated={(t) => {
            upsert(t);
            setCreating(false);
            setOpenId(t.id);
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  count,
  highlight,
  action,
  children,
}: {
  title: string;
  count: number;
  highlight?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className={cn('eyebrow text-[0.62rem]', highlight && count > 0 && 'text-mango')}>
          {title} · {count}
        </h2>
        {action}
      </div>
      {count === 0 ? (
        <p className="text-sm text-text-low">Nenhum.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
    </section>
  );
}

function TicketCard({
  t,
  now,
  onOpen,
  muted,
}: {
  t: ValetTicket;
  now: Date;
  onOpen: () => void;
  muted?: boolean;
}) {
  const since =
    t.status === 'aguardando'
      ? t.created_at
      : ['solicitado', 'buscando', 'pronto'].includes(t.status)
        ? (t.requested_at ?? t.created_at)
        : (t.checked_in_at ?? t.created_at);
  const urgent = t.status === 'solicitado' || t.status === 'aguardando';

  return (
    <button
      onClick={onOpen}
      className={cn(
        'surface-card w-full p-4 text-left transition hover:border-hairline-strong',
        urgent && 'border-mango/60',
        t.status === 'pronto' && 'border-cream/60',
        muted && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-2xl uppercase leading-none tracking-wide">#{t.code}</p>
          <p className="mt-1 font-heading tracking-widest text-cream">{formatPlate(t.plate)}</p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              'chip border px-2.5 py-1 text-[0.6rem] uppercase tracking-widest',
              urgent ? 'border-mango text-mango' : 'border-hairline text-text-mid',
            )}
          >
            {STATUS_META[t.status].driver}
          </span>
          {!muted && <p className="mt-1 text-xs tabular-nums text-text-low">{formatElapsed(since, now)}</p>}
        </div>
      </div>
      <p className="mt-2 truncate text-sm text-text-mid">
        {t.customer_name}
        {(t.car_model || t.car_color) && ` · ${[t.car_model, t.car_color].filter(Boolean).join(' ')}`}
      </p>
      {t.parking_spot && <p className="text-xs text-text-low">Vaga: {t.parking_spot}</p>}
    </button>
  );
}

function NewTicketSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (t: ValetTicket) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await createDriverTicket({ name, phone, plate });
      if (r.ok) onCreated(r.ticket);
      else setError(r.message);
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/80 backdrop-blur-sm sm:items-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-t-2xl border border-hairline bg-ink-soft p-5 sm:rounded-2xl">
        <p className="eyebrow text-[0.6rem]">Novo carro (aluno sem QR)</p>
        <input className="field-input uppercase tracking-widest" placeholder="Placa" value={plate} onChange={(e) => setPlate(e.target.value)} autoFocus />
        <input className="field-input" placeholder="Nome do aluno" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field-input" placeholder="Telefone (opcional)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <p className="text-xs text-text-low">
          Depois de criar, passe o código pro aluno — ele usa em "Já tenho um código" no QR pra acompanhar e pedir o carro.
        </p>
        {error && <p className="text-sm text-strawberry">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-primary flex-1 py-3" disabled={pending}>
            {pending ? 'Criando…' : 'Criar ticket'}
          </button>
          <button type="button" className="btn-ghost flex-1 py-3" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function HistoryTab({ now, onOpen }: { now: Date; onOpen: (t: ValetTicket) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ValetTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const search = useCallback((q: string) => {
    start(async () => {
      const r = await searchHistory(q);
      if (r.ok) {
        setResults(r.tickets);
        setError(null);
      } else setError(r.message);
    });
  }, []);

  useEffect(() => {
    search('');
  }, [search]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="flex gap-2"
      >
        <input
          className="field-input"
          placeholder="Buscar por placa, código ou nome"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-primary px-5 text-xs" disabled={pending}>
          Buscar
        </button>
      </form>
      <p className="text-xs text-text-low">Últimos 30 dias. As fotos são apagadas automaticamente depois disso.</p>
      {error && <p className="text-sm text-strawberry">{error}</p>}
      {pending && !results && <p className="text-sm text-text-low">Carregando…</p>}
      {results && results.length === 0 && <p className="text-sm text-text-low">Nada encontrado.</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {results?.map((t) => (
          <TicketCard key={t.id} t={t} now={now} onOpen={() => onOpen(t)} muted={!ACTIVE_STATUSES.includes(t.status)} />
        ))}
      </div>
    </div>
  );
}
