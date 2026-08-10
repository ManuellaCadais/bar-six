import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase com service_role — ignora RLS.
 * SÓ pode ser usado no servidor (Server Actions, Route Handlers, RSC).
 * O import 'server-only' garante erro de build se vazar para o cliente.
 */
export function getAdminClient(): SupabaseClient<any, 'bar', any> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Variáveis NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes. Configure o ambiente do servidor.',
    );
  }

  return createClient(url, serviceKey, {
    // Mesmo projeto Supabase do six_control (schema `public`) — o bar vive
    // isolado no schema `bar`. Este client nunca deve tocar em `public`.
    db: { schema: 'bar' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
