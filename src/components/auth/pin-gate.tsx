'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { login, setupPin } from '@/lib/actions/auth';
import type { SessionRole } from '@/lib/auth';
import { Seal } from '@/components/brand';

export function PinGate({
  area,
  configured,
  next,
}: {
  area: SessionRole;
  configured: boolean;
  next: string;
}) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const setup = !configured;
  const title = area === 'bar' ? 'Painel do Bar' : 'Admin do Cardápio';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (setup && pin !== confirm) {
      setError('Os PINs não coincidem.');
      return;
    }
    start(async () => {
      const res = setup ? await setupPin(area, pin) : await login(area, pin);
      if (res.ok) {
        router.push(next);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Seal className="mx-auto h-14 w-14 text-cream/75" />
          <p className="eyebrow mt-4 text-[0.6rem]">SIX Wowness Club</p>
          <h1 className="mt-1 font-heading text-2xl uppercase tracking-wide">{title}</h1>
          <p className="mt-2 text-sm text-text-mid">
            {setup
              ? 'Primeiro acesso: defina um PIN para proteger esta área.'
              : 'Digite o PIN para continuar.'}
          </p>
        </div>

        <form onSubmit={submit} className="surface-card mt-6 p-6 space-y-4">
          <div>
            <label className="field-label" htmlFor="pin">
              {setup ? 'Novo PIN (4 a 8 dígitos)' : 'PIN'}
            </label>
            <input
              id="pin"
              className="field-input text-center text-2xl tracking-[0.5em]"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>

          {setup && (
            <div>
              <label className="field-label" htmlFor="pin2">
                Confirme o PIN
              </label>
              <input
                id="pin2"
                className="field-input text-center text-2xl tracking-[0.5em]"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-hibiscus/15 border border-hibiscus/40 px-3 py-2 text-sm text-strawberry">
              {error}
            </p>
          )}

          <button className="btn-primary w-full py-3.5" disabled={pending}>
            {pending ? 'Aguarde…' : setup ? 'Definir PIN e entrar' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
