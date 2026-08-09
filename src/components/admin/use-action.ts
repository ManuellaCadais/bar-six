'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ActionResult = { ok: boolean; message?: string };

/** Executa uma Server Action, trata pending/erro e revalida os dados no sucesso. */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<ActionResult>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.ok) {
          onOk?.();
          router.refresh();
        } else {
          setError(res.message ?? 'Ocorreu um erro.');
        }
      } catch {
        setError('Sessão expirada ou sem permissão. Faça login novamente.');
      }
    });
  }

  return { pending, error, run, setError };
}
