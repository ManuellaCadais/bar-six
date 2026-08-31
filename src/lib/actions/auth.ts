'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAuthClient } from '@/lib/supabase/server';
import { getBarSession, ACTIVE_UNIT_COOKIE } from '@/lib/session';

export type AuthResult = { ok: true } | { ok: false; message: string };

/**
 * Login com a MESMA conta (e-mail + senha) do six-control — é o mesmo
 * projeto Supabase, mesma auth.users. Depois de autenticar, confirma que
 * o perfil (public.profiles) tem a permissão certa pra área pedida —
 * "estar logado" não basta, precisa do cargo certo.
 */
export async function signIn(
  area: 'bar' | 'admin',
  email: string,
  password: string,
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { ok: false, message: 'Informe e-mail e senha.' };
  }

  const supabase = await getAuthClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (signInError) {
    return { ok: false, message: 'E-mail ou senha incorretos.' };
  }

  const session = await getBarSession();
  if (!session) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: 'Sua conta não está ativa ou não está vinculada a nenhuma unidade.',
    };
  }

  const allowed =
    area === 'bar' ? session.permissions.canViewBar : session.permissions.canManageBarCardapio;
  if (!allowed) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message:
        area === 'bar'
          ? 'Sua conta não tem acesso ao painel do bar.'
          : 'Sua conta não tem acesso ao admin do cardápio.',
    };
  }

  return { ok: true };
}

export async function logout(): Promise<void> {
  const supabase = await getAuthClient();
  await supabase.auth.signOut();
  const store = await cookies();
  store.delete(ACTIVE_UNIT_COOKIE);
  redirect('/');
}

/**
 * Troca a unidade que a sessão está visualizando — só pra quem tem
 * canViewAllUnits (Master, Sócio). Pra qualquer outro papel, a unidade
 * já vem travada em public.profiles.unit_id e este cookie é ignorado
 * em getBarSession().
 */
export async function setActiveUnit(unitId: string): Promise<AuthResult> {
  const session = await getBarSession();
  if (!session || !session.permissions.canViewAllUnits) {
    return { ok: false, message: 'Sem permissão pra alternar de unidade.' };
  }
  const valid = session.availableUnits?.some((u) => u.id === unitId);
  if (!valid) return { ok: false, message: 'Unidade inválida.' };

  const store = await cookies();
  store.set(ACTIVE_UNIT_COOKIE, unitId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return { ok: true };
}
