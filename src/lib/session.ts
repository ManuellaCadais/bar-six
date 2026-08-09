import 'server-only';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  verifySessionToken,
  roleCanAccess,
  type SessionRole,
} from './auth';

/** Papel da sessão atual (lido do cookie assinado), ou null. */
export async function getSessionRole(): Promise<SessionRole | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Garante que a sessão pode acessar a área; lança se não puder. */
export async function requireRole(area: 'bar' | 'admin'): Promise<void> {
  const role = await getSessionRole();
  if (!roleCanAccess(role, area)) {
    throw new Error('Sessão expirada ou sem permissão. Faça login novamente.');
  }
}
