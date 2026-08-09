'use client';

import { useEffect, useState } from 'react';

/** Retorna o "agora" atualizado a cada intervalo (para tempo decorrido ao vivo). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
