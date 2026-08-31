'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/actions/auth';
import { Seal } from '@/components/brand';

export function LoginForm({
  area,
  next,
}: {
  area: 'bar' | 'admin';
  next: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const title = area === 'bar' ? 'Painel do Bar' : 'Admin do Cardápio';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await signIn(area, email, password);
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
            Entre com a mesma conta que você já usa no Sistema Operacional SIX.
          </p>
        </div>

        <form onSubmit={submit} className="surface-card mt-6 p-6 space-y-4">
          <div>
            <label className="field-label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className="field-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              className="field-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-hibiscus/15 border border-hibiscus/40 px-3 py-2 text-sm text-strawberry">
              {error}
            </p>
          )}

          <button className="btn-primary w-full py-3.5" disabled={pending}>
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
