'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import { getSettingValue } from '@/lib/queries';
import { requireRole } from '@/lib/session';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  hashPin,
  verifyPin,
  type SessionRole,
} from '@/lib/auth';

export type AuthResult = { ok: true } | { ok: false; message: string };

function pinKey(area: SessionRole): string {
  return area === 'admin' ? 'admin_pin_hash' : 'bar_pin_hash';
}

async function setSessionCookie(area: SessionRole): Promise<void> {
  const token = await createSessionToken(area);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

async function saveHash(area: SessionRole, pin: string): Promise<void> {
  const sb = getAdminClient();
  const hash = await hashPin(pin);
  await sb.from('settings').upsert(
    {
      key: pinKey(area),
      value: hash,
      is_public: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
}

/** Diz se o PIN da área já foi configurado (para o formulário de 1º acesso). */
export async function pinStatus(area: SessionRole): Promise<{ configured: boolean }> {
  const hash = await getSettingValue<string | null>(pinKey(area));
  return { configured: !!hash };
}

export async function login(area: SessionRole, pin: string): Promise<AuthResult> {
  const clean = (pin ?? '').trim();
  if (clean.length < 4) return { ok: false, message: 'PIN inválido.' };

  const hash = await getSettingValue<string | null>(pinKey(area));
  if (!hash)
    return { ok: false, message: 'PIN ainda não configurado. Defina o PIN primeiro.' };

  const valid = await verifyPin(clean, hash);
  if (!valid) return { ok: false, message: 'PIN incorreto.' };

  await setSessionCookie(area);
  return { ok: true };
}

/** Primeiro acesso: define o PIN quando ainda não existe. */
export async function setupPin(area: SessionRole, pin: string): Promise<AuthResult> {
  const clean = (pin ?? '').trim();
  if (!/^\d{4,8}$/.test(clean))
    return { ok: false, message: 'Use um PIN de 4 a 8 dígitos.' };

  const existing = await getSettingValue<string | null>(pinKey(area));
  if (existing) return { ok: false, message: 'PIN já configurado. Faça login.' };

  await saveHash(area, clean);
  await setSessionCookie(area);
  return { ok: true };
}

/** Troca de PIN (somente admin autenticado pode alterar qualquer PIN). */
export async function changePin(
  area: SessionRole,
  newPin: string,
): Promise<AuthResult> {
  await requireRole('admin');
  const clean = (newPin ?? '').trim();
  if (!/^\d{4,8}$/.test(clean))
    return { ok: false, message: 'Use um PIN de 4 a 8 dígitos.' };
  await saveHash(area, clean);
  return { ok: true };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/');
}
