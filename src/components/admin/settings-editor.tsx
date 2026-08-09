'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { updateLocations, updateAlertMinutes } from '@/lib/actions/admin';
import { setBarOpen } from '@/lib/actions/bar';
import { changePin } from '@/lib/actions/auth';
import type { PublicSettings } from '@/lib/types';
import type { SessionRole } from '@/lib/auth';
import { useAction } from './use-action';

function BarOpenControl({ initial }: { initial: boolean }) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(initial);
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-heading uppercase tracking-wide text-text-hi">Bar</p>
        <p className="text-sm text-text-mid">
          {open ? 'Aberto — recebendo pedidos.' : 'Fechado — pedidos bloqueados.'}
        </p>
      </div>
      <button
        role="switch"
        aria-checked={open}
        disabled={pending}
        onClick={() => run(() => setBarOpen(!open), () => setOpen(!open))}
        className={cn(
          'relative h-8 w-14 flex-none rounded-full transition-colors',
          open ? 'bg-cream' : 'bg-white/15',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-6 w-6 rounded-full bg-ink transition-transform',
            open ? 'translate-x-[1.625rem]' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

function AlertMinutesControl({ initial }: { initial: number }) {
  const { pending, error, run } = useAction();
  const [value, setValue] = useState(String(initial));
  return (
    <div>
      <label className="field-label">Alerta de atraso (minutos)</label>
      <div className="flex gap-2">
        <input
          className="field-input py-2 w-28"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          className="btn-ghost px-4 py-2 text-xs"
          disabled={pending}
          onClick={() => run(() => updateAlertMinutes(Number(value)))}
        >
          Salvar
        </button>
      </div>
      <p className="mt-1 text-xs text-text-low">
        Após esse tempo o pedido fica vermelho na fila do bar.
      </p>
      {error && <p className="mt-1 text-sm text-strawberry">{error}</p>}
    </div>
  );
}

function LocationsControl({ initial }: { initial: string[] }) {
  const { pending, error, run } = useAction();
  const [list, setList] = useState<string[]>(initial.length ? initial : ['']);

  return (
    <div>
      <label className="field-label">Locais da academia</label>
      <div className="space-y-2">
        {list.map((loc, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="field-input py-2 flex-1"
              value={loc}
              onChange={(e) =>
                setList((p) => p.map((v, idx) => (idx === i ? e.target.value : v)))
              }
              placeholder="Ex.: Musculação"
            />
            <button
              className="btn-ghost px-3 py-2 text-xs"
              onClick={() => setList((p) => p.filter((_, idx) => idx !== i))}
              aria-label="Remover local"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          className="btn-ghost px-4 py-2 text-xs"
          onClick={() => setList((p) => [...p, ''])}
        >
          + Adicionar local
        </button>
        <button
          className="btn-primary px-4 py-2 text-xs"
          disabled={pending}
          onClick={() => run(() => updateLocations(list))}
        >
          Salvar locais
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-strawberry">{error}</p>}
    </div>
  );
}

function PinControl({ area }: { area: SessionRole }) {
  const { pending, error, run, setError } = useAction();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);

  function save() {
    setDone(false);
    if (pin !== confirm) {
      setError('Os PINs não coincidem.');
      return;
    }
    run(
      () => changePin(area, pin),
      () => {
        setPin('');
        setConfirm('');
        setDone(true);
      },
    );
  }

  return (
    <div>
      <label className="field-label">
        PIN do {area === 'bar' ? 'painel do bar' : 'admin'}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="field-input py-2"
          type="password"
          inputMode="numeric"
          placeholder="Novo PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          maxLength={8}
        />
        <input
          className="field-input py-2"
          type="password"
          inputMode="numeric"
          placeholder="Confirmar"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
          maxLength={8}
        />
      </div>
      <button className="btn-ghost mt-2 px-4 py-2 text-xs" disabled={pending} onClick={save}>
        Alterar PIN
      </button>
      {done && <p className="mt-1 text-sm text-cream">PIN atualizado.</p>}
      {error && <p className="mt-1 text-sm text-strawberry">{error}</p>}
    </div>
  );
}

export function SettingsEditor({ settings }: { settings: PublicSettings }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="surface-card p-5">
        <h2 className="eyebrow text-[0.6rem] mb-4">Operação</h2>
        <div className="space-y-5">
          <BarOpenControl initial={settings.bar_open} />
          <div className="hairline" />
          <AlertMinutesControl initial={settings.alert_minutes} />
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="eyebrow text-[0.6rem] mb-4">Locais</h2>
        <LocationsControl initial={settings.locations} />
      </div>

      <div className="surface-card p-5 sm:col-span-2">
        <h2 className="eyebrow text-[0.6rem] mb-4">Segurança — PINs</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <PinControl area="bar" />
          <PinControl area="admin" />
        </div>
      </div>
    </div>
  );
}
