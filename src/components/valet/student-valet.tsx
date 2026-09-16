'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  cancelStudentTicket,
  createStudentTicket,
  getStudentTicket,
  recoverTicket,
  requestCar,
} from '@/lib/actions/valet-public';
import { formatBarTime } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import { Seal } from '@/components/brand';
import {
  STATUS_META,
  STUDENT_FLOW,
  formatPlate,
  type PublicTicketView,
} from '@/lib/valet/constants';

const POLL_MS = 4000;

/**
 * Valet do aluno, sem login. O token do ticket fica salvo neste celular
 * (localStorage, por unidade). A tela consulta o servidor a cada poucos
 * segundos — sem realtime aqui de propósito: placa/telefone não podem
 * ficar legíveis pra chave pública do navegador.
 */
export function StudentValet({ unitCode, unitName }: { unitCode: string; unitName: string }) {
  const storageKey = `six_valet_${unitCode}`;
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [ticket, setTicket] = useState<PublicTicketView | null>(null);
  const [mode, setMode] = useState<'novo' | 'codigo'>('novo');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const prevStatus = useRef<string | null>(null);

  const saveToken = useCallback(
    (t: string | null) => {
      try {
        if (t) localStorage.setItem(storageKey, t);
        else localStorage.removeItem(storageKey);
      } catch {
        /* armazenamento bloqueado — segue só em memória */
      }
      setToken(t);
    },
    [storageKey],
  );

  useEffect(() => {
    try {
      setToken(localStorage.getItem(storageKey));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  const refresh = useCallback(async () => {
    if (!token) return;
    const t = await getStudentTicket(token);
    if (!t) {
      saveToken(null);
      setTicket(null);
      return;
    }
    setTicket(t);
  }, [token, saveToken]);

  useEffect(() => {
    if (!token) return;
    refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, refresh]);

  // Vibra quando o carro chega na saída.
  useEffect(() => {
    if (!ticket) return;
    if (prevStatus.current && prevStatus.current !== ticket.status && ticket.status === 'pronto') {
      if (typeof navigator.vibrate === 'function') navigator.vibrate([150, 80, 150, 80, 300]);
    }
    prevStatus.current = ticket.status;
  }, [ticket]);

  function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    start(async () => {
      try {
        const r = await fn();
        if (!r.ok) setError(r.message ?? 'Algo deu errado. Tente de novo.');
        await refresh();
      } catch {
        setError('Sem conexão. Verifique a internet e tente de novo.');
      }
    });
  }

  if (!hydrated || (token && !ticket)) {
    return (
      <Shell unitName={unitName} unitCode={unitCode}>
        <p className="mt-10 text-center text-sm text-text-low">Carregando…</p>
      </Shell>
    );
  }

  // ───────────── Sem ticket: deixar o carro / já tenho código ─────────────
  if (!token || !ticket) {
    return (
      <Shell unitName={unitName} unitCode={unitCode}>
        <div className="mt-6 flex gap-2">
          {(['novo', 'codigo'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cn(
                'flex-1 rounded-full px-3 py-2 text-xs uppercase tracking-widest transition',
                mode === m ? 'bg-cream text-ink' : 'border border-hairline text-text-mid',
              )}
            >
              {m === 'novo' ? 'Deixar meu carro' : 'Já tenho um código'}
            </button>
          ))}
        </div>
        {mode === 'novo' ? (
          <NewTicketForm
            pending={pending}
            error={error}
            onSubmit={(v) =>
              act(async () => {
                const r = await createStudentTicket({ unitCode, ...v });
                if (r.ok) saveToken(r.token);
                return r;
              })
            }
          />
        ) : (
          <RecoverForm
            pending={pending}
            error={error}
            onSubmit={(v) =>
              act(async () => {
                const r = await recoverTicket({ unitCode, ...v });
                if (r.ok) saveToken(r.token);
                return r;
              })
            }
          />
        )}
      </Shell>
    );
  }

  // ───────────── Com ticket: acompanhamento ─────────────
  const finished = ticket.status === 'entregue' || ticket.status === 'cancelado';
  const ready = ticket.status === 'pronto';
  const current = STUDENT_FLOW.indexOf(ticket.status);
  const meta = STATUS_META[ticket.status];

  return (
    <Shell unitName={unitName} unitCode={unitCode}>
      <div className="mt-6 text-center">
        <p className="eyebrow text-[0.6rem]">Seu código</p>
        <p className="font-heading text-5xl uppercase tracking-[0.2em]">#{ticket.code}</p>
        <p className="mt-1 font-heading tracking-widest text-cream">
          {formatPlate(ticket.plate)}
          {ticket.car_model && <span className="text-text-mid"> · {ticket.car_model}</span>}
        </p>
      </div>

      <div
        className={cn(
          'mt-6 rounded-2xl border px-6 py-5 text-center transition-all',
          ready && 'animate-pulse-ready border-mango bg-mango text-ink',
          ticket.status === 'entregue' && 'border-cream/40 bg-cream/10',
          ticket.status === 'cancelado' && 'border-hibiscus/50 bg-hibiscus/15',
          !ready && !finished && 'border-hairline bg-surface/70',
        )}
      >
        <p className={cn('font-heading text-2xl uppercase tracking-wide', ready ? 'text-ink' : 'text-text-hi')}>
          {meta.label}
        </p>
        <p className={cn('mt-1 text-sm', ready ? 'text-ink/75' : 'text-text-mid')}>
          {ticket.status === 'cancelado' && ticket.cancel_reason ? ticket.cancel_reason : meta.hint}
        </p>
      </div>

      {ticket.status === 'estacionado' && (
        <button className="btn-primary mt-5 w-full py-4 text-base" disabled={pending} onClick={() => act(() => requestCar(token))}>
          {pending ? 'Enviando…' : 'Buscar meu carro'}
        </button>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-hibiscus/40 bg-hibiscus/15 px-3 py-2 text-sm text-strawberry">{error}</p>
      )}

      {ticket.status !== 'cancelado' && (
        <ol className="mt-7 space-y-3">
          {STUDENT_FLOW.map((s, i) => {
            const state = i < current ? 'done' : i === current ? 'active' : 'pending';
            return (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid h-7 w-7 flex-none place-items-center rounded-full border-2',
                    state === 'done' && 'border-cream bg-cream/15',
                    state === 'active' && 'border-mango bg-mango/15',
                    state === 'pending' && 'border-white/15',
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', state === 'pending' ? 'bg-white/20' : 'bg-current text-cream')} />
                </span>
                <span className={cn('font-heading text-sm uppercase tracking-wide', state === 'pending' ? 'text-text-low' : 'text-text-hi')}>
                  {STATUS_META[s].label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-6 text-center text-xs text-text-low">
        Aberto às {formatBarTime(ticket.created_at)}
        {ticket.requested_at && ` · pedido às ${formatBarTime(ticket.requested_at)}`}
        {ticket.delivered_at && ` · entregue às ${formatBarTime(ticket.delivered_at)}`}
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        {ticket.status === 'aguardando' && (
          <button
            className="text-xs uppercase tracking-widest text-text-low hover:text-strawberry"
            disabled={pending}
            onClick={() => act(() => cancelStudentTicket(token))}
          >
            Cancelar (ainda não entreguei a chave)
          </button>
        )}
        {finished && (
          <button
            className="btn-ghost px-5 py-2.5 text-xs"
            onClick={() => {
              saveToken(null);
              setTicket(null);
            }}
          >
            Novo ticket
          </button>
        )}
      </div>
    </Shell>
  );
}

function Shell({
  unitName,
  unitCode,
  children,
}: {
  unitName: string;
  unitCode: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-8">
      <header className="text-center">
        <Seal className="mx-auto h-12 w-12 text-cream/70" />
        <p className="eyebrow mt-3 text-[0.6rem]">Valet · {unitName}</p>
      </header>
      {children}
      <div className="mt-10 text-center">
        <Link href={`/${unitCode}`} className="text-xs uppercase tracking-widest text-text-low hover:text-text-mid">
          ← Voltar
        </Link>
      </div>
    </div>
  );
}

function NewTicketForm({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  onSubmit: (v: { name: string; phone: string; plate: string }) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  return (
    <form
      className="surface-card mt-5 space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, phone, plate });
      }}
    >
      <div>
        <label className="field-label" htmlFor="v-name">Seu nome</label>
        <input id="v-name" className="field-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="v-phone">Telefone (com DDD)</label>
        <input id="v-phone" className="field-input" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="v-plate">Placa do carro</label>
        <input
          id="v-plate"
          className="field-input uppercase tracking-widest"
          autoCapitalize="characters"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
        />
      </div>
      {error && <p className="text-sm text-strawberry">{error}</p>}
      <button className="btn-primary w-full py-3.5" disabled={pending}>
        {pending ? 'Abrindo…' : 'Gerar meu código'}
      </button>
      <p className="text-xs text-text-low">
        Depois é só entregar a chave ao motorista. Quando for embora, abra este QR de novo e toque em "Buscar meu carro".
      </p>
    </form>
  );
}

function RecoverForm({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  onSubmit: (v: { code: string; plateEnd: string }) => void;
}) {
  const [code, setCode] = useState('');
  const [plateEnd, setPlateEnd] = useState('');
  return (
    <form
      className="surface-card mt-5 space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ code, plateEnd });
      }}
    >
      <div>
        <label className="field-label" htmlFor="v-code">Código do ticket</label>
        <input
          id="v-code"
          className="field-input text-center font-heading text-xl uppercase tracking-[0.3em]"
          maxLength={5}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="v-plate-end">3 últimos caracteres da placa</label>
        <input
          id="v-plate-end"
          className="field-input uppercase tracking-widest"
          maxLength={3}
          value={plateEnd}
          onChange={(e) => setPlateEnd(e.target.value.toUpperCase())}
        />
      </div>
      {error && <p className="text-sm text-strawberry">{error}</p>}
      <button className="btn-primary w-full py-3.5" disabled={pending}>
        {pending ? 'Buscando…' : 'Acompanhar meu carro'}
      </button>
    </form>
  );
}
