import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Cliente Supabase Auth para Server Components / Server Actions — usa a
 * chave ANÔNIMA (não a service_role) e o cookie de sessão do usuário
 * logado. Schema `public` (padrão): é aqui que fica `public.profiles`,
 * a mesma conta/tabela de usuários do six_control.
 *
 * NUNCA use este client pra ler/escrever dados de negócio do bar — isso
 * continua sendo `getAdminClient()` (service_role, schema `bar`). Este
 * client serve só pra: (1) auth.signInWithPassword/signOut, (2) ler a
 * PRÓPRIA linha de public.profiles (a policy profiles_select já libera
 * isso pra chave anônima autenticada).
 */
export async function getAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado de dentro de um Server Component (não pode escrever
            // cookie) — o middleware já cuida de renovar a sessão nesse caso.
          }
        },
      },
    },
  );
}
