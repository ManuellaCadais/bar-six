'use client';

import { useRef, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';
import { getPhotoUploadUrl, registerPhoto } from '@/lib/actions/valet';
import { cn } from '@/lib/cn';
import {
  SLOT_LABEL,
  formatPlate,
  type PhotoPhase,
  type PhotoSlot,
  type ValetPhoto,
} from '@/lib/valet/constants';

const BUCKET = 'valet-photos';

/**
 * Reduz a foto (máx. 1600px, JPEG ~72%) e carimba data/hora + placa no
 * canto — a foto vira prova por si só, mesmo baixada fora do sistema.
 * Se o navegador não conseguir decodificar (formato raro), envia o original.
 */
async function prepareImage(file: File, stamp: string): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);

    const size = Math.max(16, Math.round(w / 40));
    ctx.font = `600 ${size}px sans-serif`;
    const pad = Math.round(size * 0.6);
    const textW = ctx.measureText(stamp).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, h - size - pad * 2, textW + pad * 2, size + pad * 2);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'bottom';
    ctx.fillText(stamp, pad, h - pad);

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.72));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function PhotoCapture({
  ticketId,
  phase,
  slot,
  plate,
  photo,
  onUploaded,
  disabled,
}: {
  ticketId: string;
  phase: PhotoPhase;
  slot: PhotoSlot;
  plate: string;
  /** Foto já registrada neste lado (ou null). */
  photo: ValetPhoto | null;
  onUploaded: (photo: ValetPhoto) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const when = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date());
      const label = phase === 'checkin' ? 'Chegada' : 'Devolução';
      const blob = await prepareImage(file, `SIX Valet · ${formatPlate(plate)} · ${label} · ${when}`);

      const up = await getPhotoUploadUrl(ticketId, phase, slot);
      if (!up.ok) throw new Error(up.message);

      const { error: upErr } = await getBrowserClient()
        .storage.from(BUCKET)
        .uploadToSignedUrl(up.path, up.token, blob, { contentType: 'image/jpeg' });
      if (upErr) throw new Error('Falha no envio. Verifique a internet e tente de novo.');

      const reg = await registerPhoto(ticketId, phase, slot, up.path);
      if (!reg.ok) throw new Error(reg.message);
      onUploaded(reg.photo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar a foto.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const done = !!photo?.url;

  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl border text-xs uppercase tracking-widest transition',
          done ? 'border-cream/50' : 'border-dashed border-hairline-strong text-text-mid hover:text-text-hi',
          busy && 'animate-pulse',
        )}
      >
        {done && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo!.url!} alt={SLOT_LABEL[slot]} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span
          className={cn(
            'relative rounded-full px-2.5 py-1',
            done ? 'bg-ink/75 text-cream' : '',
          )}
        >
          {busy ? 'Enviando…' : done ? `✓ ${SLOT_LABEL[slot]}` : `📷 ${SLOT_LABEL[slot]}`}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {error && <p className="mt-1 text-[0.7rem] text-strawberry">{error}</p>}
    </div>
  );
}
