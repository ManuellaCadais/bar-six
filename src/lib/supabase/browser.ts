import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase para o navegador (chave anônima pública).
 * Usado para leitura do cardápio e subscriptions de realtime.
 * Singleton para reaproveitar a conexão do canal realtime.
 */
let browserClient: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes. Configure o .env.local.',
    );
  }

  browserClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });

  return browserClient;
}
