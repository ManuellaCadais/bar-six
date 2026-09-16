'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  cancelTicket,
  confirmCheckin,
  deliverCar,
  listTicketPhotos,
  markReady,
  revertTicket,
  startFetch,
  updateCarInfo,
} from '@/lib/actions/valet';
import { formatBarTime } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import {
  REQUIRED_SLOTS,
  SLOT_LABEL,
  STATUS_META,
  formatPlate,
  type PhotoPhase,
  type PhotoSlot,
  type ValetPhoto,
  type ValetTicket,
} from '@/lib/valet/constants';
import { PhotoCapture } from './photo-capture';

type ActionResult = { ok: true; ticket: ValetTicket } | { ok: false; message: string };

export function TicketSheet({
  ticket,
  onClose,
  onTicket,
}: {
  ticket: ValetTicket;
  onClose: () => void;
  /** Devolve o ticket atualizado pro painel. */
  onTicket: (t: ValetTicket) => void;
}) {
  const [photos, setPhotos] = useState<ValetPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [model, setModel] = useState(ticket.car_model ?? '');
  const [color, setColor] = useState(ticket.car_color ?? '');
  const [spot, setSpot] = useState(ticket.parking_spot ?? '');
  const [code, setCode] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let alive = true;
    listTicketPhotos(ticket.id).then((r) => {
      if (!alive) return;
      if (r.ok) setPhotos(r.photos);
      setLoadingPhotos(false);
    });
    return () => {
      alive = false;
    };
  }, [ticket.id]);

  const bySlot = useMemo(() => {
    const map = new Map<string, ValetPhoto>();
    for (const p of photos) if (p.slot !== 'extra') map.set(`${p.phase}:${p.slot}`, p);
    return map;
  }, [photos]);

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    start(async () => {
      try {
        const r = await fn();
        if (r.ok) {
          onTicket(r.ticket);
          after?.();
        } else setError(r.message);
      } catch {
        setError('Falha ao falar com o servidor. Verifique a internet.');
      }
    });
  }

  function onUploaded(photo: ValetPhoto) {
    setPhotos((prev) => [
      ...prev.filter((p) => p.slot === 'extra' || !(p.phase === photo.phase && p.slot === photo.slot)),
      photo,
    ]);
  }

  const phaseDone = (phase: PhotoPhase) =>
    REQUIRED_SLOTS.every((s) => bySlot.get(`${phase}:${s}`)?.url);

  const s = ticket.status;
  const finished = s === 'entregue' || s === 'cancelado';

  // Função (não componente): um componente declarado aqui dentro seria
  // recriado a cada render e remontaria a câmera no meio de um envio.
  function photoGrid(phase: PhotoPhase) {
    const extras = photos.filter((p) => p.phase === phase && p.slot === 'extra');
    return (
      <div>
        <div className="grid grid-cols-2 gap-2">
          {REQUIRED_SLOTS.map((slot) => (
            <PhotoCapture
              key={slot}
              ticketId={ticket.id}
              phase={phase}
              slot={slot}
              plate={ticket.plate}
              photo={bySlot.get(`${phase}:${slot}`) ?? null}
              onUploaded={onUploaded}
              disabled={pending}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {extras.map((p) =>
            p.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt="Detalhe" className="aspect-[4/3] w-full rounded-lg object-cover" />
            ) : null,
          )}
          <PhotoCapture
            key={`extra-${extras.length}`}
            ticketId={ticket.id}
            phase={phase}
            slot="extra"
            plate={ticket.plate}
            photo={null}
            onUploaded={onUploaded}
            disabled={pending}
          />
        </div>
        <p className="mt-1 text-[0.7rem] text-text-low">
          Use "Detalhe" pra registrar arranhão, amassado ou objeto de valor.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/80 backdrop-blur-sm sm:items-center">
      <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-hairline bg-ink-soft p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-[0.6rem]">{STATUS_META[s].driver}</p>
            <p className="font-heading text-3xl uppercase tracking-wide">#{ticket.code}</p>
            <p className="font-heading text-lg tracking-widest text-cream">{formatPlate(ticket.plate)}</p>
          </div>
          <button onClick={onClose} className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid">
            Fechar
          </button>
        </div>

        <div className="mt-3 space-y-0.5 text-sm text-text-mid">
          <p>
            <span className="text-text-low">Aluno:</span> {ticket.customer_name}
            {ticket.customer_phone && (
              <>
                {' · '}
                <a href={`tel:${ticket.customer_phone}`} className="text-cream underline">
                  {ticket.customer_phone}
                </a>
              </>
            )}
          </p>
          {(ticket.car_model || ticket.car_color) && s !== 'aguardando' && (
            <p>
              <span className="text-text-low">Carro:</span> {[ticket.car_model, ticket.car_color].filter(Boolean).join(' · ')}
            </p>
          )}
          {ticket.parking_spot && s !== 'aguardando' && (
            <p>
              <span className="text-text-low">Vaga/chave:</span> {ticket.parking_spot}
            </p>
          )}
          <p className="text-xs text-text-low">
            Aberto {formatBarTime(ticket.created_at)}
            {ticket.checked_in_at && ` · estacionado ${formatBarTime(ticket.checked_in_at)}`}
            {ticket.requested_at && ` · pedido ${formatBarTime(ticket.requested_at)}`}
            {ticket.ready_at && ` · na saída ${formatBarTime(ticket.ready_at)}`}
            {ticket.delivered_at && ` · entregue ${formatBarTime(ticket.delivered_at)}`}
          </p>
          {ticket.cancel_reason && <p className="text-strawberry">{ticket.cancel_reason}</p>}
        </div>

        {/* ── Chegada ── */}
        {s === 'aguardando' && (
          <section className="mt-5 space-y-3">
            <h3 className="eyebrow text-[0.6rem]">Receber o carro</h3>
            <div className="grid grid-cols-2 gap-2">
              <input className="field-input" placeholder="Modelo" value={model} onChange={(e) => setModel(e.target.value)} />
              <input className="field-input" placeholder="Cor" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            <input className="field-input" placeholder="Vaga / onde ficou a chave" value={spot} onChange={(e) => setSpot(e.target.value)} />
            {loadingPhotos ? <p className="text-sm text-text-low">Carregando fotos…</p> : photoGrid('checkin')}
            <button
              className="btn-primary w-full py-3.5"
              disabled={pending || !phaseDone('checkin')}
              onClick={() => run(() => confirmCheckin(ticket.id, { car_model: model, car_color: color, parking_spot: spot }))}
            >
              {phaseDone('checkin') ? 'Confirmar carro estacionado' : 'Tire as 4 fotos pra confirmar'}
            </button>
          </section>
        )}

        {/* ── Estacionado / pedido ── */}
        {(s === 'estacionado' || s === 'solicitado') && (
          <section className="mt-5 space-y-3">
            <div className="flex gap-2">
              <input className="field-input" placeholder="Vaga / onde ficou a chave" value={spot} onChange={(e) => setSpot(e.target.value)} />
              <button
                className="btn-ghost px-4 text-xs"
                disabled={pending || spot === (ticket.parking_spot ?? '')}
                onClick={() => run(() => updateCarInfo(ticket.id, { parking_spot: spot }))}
              >
                Salvar
              </button>
            </div>
            <button className="btn-primary w-full py-3.5" disabled={pending} onClick={() => run(() => startFetch(ticket.id))}>
              {s === 'solicitado' ? 'Ir buscar o carro' : 'Buscar carro (aluno pediu no balcão)'}
            </button>
            <PhotoCompare photos={photos} only="checkin" />
          </section>
        )}

        {/* ── Buscando: fotos de devolução ── */}
        {s === 'buscando' && (
          <section className="mt-5 space-y-3">
            <h3 className="eyebrow text-[0.6rem]">Fotos antes de entregar</h3>
            {loadingPhotos ? <p className="text-sm text-text-low">Carregando fotos…</p> : photoGrid('checkout')}
            <button
              className="btn-primary w-full py-3.5"
              disabled={pending || !phaseDone('checkout')}
              onClick={() => run(() => markReady(ticket.id))}
            >
              {phaseDone('checkout') ? 'Carro pronto na saída' : 'Tire as 4 fotos pra liberar'}
            </button>
            <button className="btn-ghost w-full py-2.5 text-xs" disabled={pending} onClick={() => run(() => revertTicket(ticket.id))}>
              Voltar pra "pedido de retirada"
            </button>
          </section>
        )}

        {/* ── Na saída: conferir código ── */}
        {s === 'pronto' && (
          <section className="mt-5 space-y-3">
            <h3 className="eyebrow text-[0.6rem]">Entregar a chave</h3>
            <p className="text-sm text-text-mid">Peça pro aluno mostrar o código no celular e digite abaixo.</p>
            <input
              className="field-input text-center font-heading text-2xl uppercase tracking-[0.4em]"
              placeholder="K7P2"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button
              className="btn-primary w-full py-3.5"
              disabled={pending || code.replace('#', '').length < 4}
              onClick={() => run(() => deliverCar(ticket.id, code), () => setCode(''))}
            >
              Confirmar entrega
            </button>
            <button className="btn-ghost w-full py-2.5 text-xs" disabled={pending} onClick={() => run(() => revertTicket(ticket.id))}>
              Voltar pra "buscando"
            </button>
            <PhotoCompare photos={photos} />
          </section>
        )}

        {finished && (
          <section className="mt-5">
            {loadingPhotos ? <p className="text-sm text-text-low">Carregando fotos…</p> : <PhotoCompare photos={photos} />}
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-hibiscus/40 bg-hibiscus/15 px-3 py-2 text-sm text-strawberry">{error}</p>
        )}

        {!finished && (
          <div className="mt-6 border-t border-hairline pt-4">
            {cancelling ? (
              <div className="space-y-2">
                <input className="field-input" placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex gap-2">
                  <button className="btn-danger flex-1 py-2.5 text-xs" disabled={pending} onClick={() => run(() => cancelTicket(ticket.id, reason))}>
                    Cancelar ticket
                  </button>
                  <button className="btn-ghost flex-1 py-2.5 text-xs" onClick={() => setCancelling(false)}>
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <button className="text-xs uppercase tracking-widest text-text-low hover:text-strawberry" onClick={() => setCancelling(true)}>
                Cancelar ticket
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Chegada x devolução lado a lado, por lado do carro — é o que resolve reclamação de dano. */
export function PhotoCompare({ photos, only }: { photos: ValetPhoto[]; only?: PhotoPhase }) {
  const get = (phase: PhotoPhase, slot: PhotoSlot) =>
    photos.find((p) => p.phase === phase && p.slot === slot) ?? null;
  const extras = photos.filter((p) => p.slot === 'extra' && (!only || p.phase === only));
  const phases: PhotoPhase[] = only ? [only] : ['checkin', 'checkout'];
  if (photos.length === 0) return <p className="text-sm text-text-low">Sem fotos registradas.</p>;

  const Thumb = ({ p }: { p: ValetPhoto | null }) =>
    p?.url ? (
      <a href={p.url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.url} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
      </a>
    ) : (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-lg border border-hairline text-[0.65rem] text-text-low">
        {p ? 'Apagada (30 dias)' : '—'}
      </div>
    );

  return (
    <div className="space-y-3">
      <div className={cn('grid gap-2 text-[0.6rem] uppercase tracking-widest text-text-low', phases.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {phases.map((ph) => (
          <span key={ph}>{ph === 'checkin' ? 'Chegada' : 'Devolução'}</span>
        ))}
      </div>
      {REQUIRED_SLOTS.map((slot) => (
        <div key={slot}>
          <p className="mb-1 text-xs text-text-mid">{SLOT_LABEL[slot]}</p>
          <div className={cn('grid gap-2', phases.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
            {phases.map((ph) => (
              <Thumb key={ph} p={get(ph, slot)} />
            ))}
          </div>
        </div>
      ))}
      {extras.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-text-mid">Detalhes</p>
          <div className="grid grid-cols-3 gap-2">
            {extras.map((p) => (
              <Thumb key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
