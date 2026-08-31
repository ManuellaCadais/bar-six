import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase para o navegador — schema `bar` (dados de negócio).
 *
 * Usa `createBrowserClient` (não o `createClient` cru) pra carregar o
 * cookie de sessão do Supabase Auth automaticamente: quando o bar/admin
 * está logado, esse client já leva o JWT dele em toda chamada (inclusive
 * Realtime) — é isso que faz a policy RLS "só vê pedido da própria
 * unidade" funcionar pra fila do bar. Pro aluno (sem login), continua
 * funcionando exatamente igual a antes — sem cookie de sessão, o client
 * simplesmente opera como anônimo.
 *
 * Singleton para reaproveitar a conexão do canal realtime.
 */
let browserClient: SupabaseClient<any, 'bar', any> | null = null;

export function getBrowserClient(): SupabaseClient<any, 'bar', any> {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes. Configure o .env.local.',
    );
  }

  browserClient = createBrowserClient(url, anonKey, {
    // Este projeto Supabase é compartilhado com outro sistema (six_control),
    // que vive no schema `public`. Tudo do bar mora isolado no schema `bar` —
    // ver supabase/schema.sql. Nunca aponte este client para `public`.
    db: { schema: 'bar' },
    realtime: { params: { eventsPerSecond: 10 } },
  });

  return browserClient;
}
