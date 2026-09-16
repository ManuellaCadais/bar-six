'use client';

import { useEffect } from 'react';

/**
 * Rede de segurança de /bar e /admin: qualquer exceção inesperada mostra
 * uma tela com saída (tentar de novo / entrar de novo) em vez do
 * "Application error" genérico do Next. O código (digest) aparece pra
 * localizar o erro exato nos logs da Vercel.
 */
export function AreaError({
  error,
  reset,
  area,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  area: 'bar' | 'admin' | 'valet';
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-heading text-2xl uppercase tracking-wide">Algo deu errado</h1>
        <p className="mt-3 text-sm text-text-mid">
          Não foi possível carregar{' '}
          {area === 'bar' ? 'o painel do bar' : area === 'admin' ? 'o admin' : 'o painel do valet'}. Tente de
          novo; se continuar, entre novamente com sua conta.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button className="btn-primary px-5 py-2.5 text-xs" onClick={reset}>
            Tentar de novo
          </button>
          <a href={`/${area}/login?next=/${area}`} className="btn-ghost px-5 py-2.5 text-xs">
            Entrar novamente
          </a>
        </div>
        {error.digest && (
          <p className="mt-6 text-[0.65rem] text-text-low">Código: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
