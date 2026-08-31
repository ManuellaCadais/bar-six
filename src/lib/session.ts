import 'server-only';
import { cookies } from 'next/headers';
import { getAuthClient } from './supabase/server';
import { getBarPermissions, type BarPermissions } from './permissions';

/** Cookie que guarda qual unidade um usuário com canViewAllUnits está visualizando agora. */
export const ACTIVE_UNIT_COOKIE = 'six_active_unit';

export interface UnitOption {
  id: string;
  name: string;
  code: string;
}

export interface BarSession {
  userId: string;
  role: string;
  fullName: string | null;
  permissions: BarPermissions;
  /** Unidade efetiva desta sessão — a própria, ou a selecionada no seletor (só se canViewAllUnits). */
  unitId: string;
  unitName: string;
  unitCode: string;
  /** Lista de unidades pra alternar — só preenchida quando canViewAllUnits é true. */
  availableUnits: UnitOption[] | null;
}

interface ProfileRow {
  id: string;
  role: string;
  unit_id: string | null;
  unit_name: string | null;
  account_status: string;
  permissions: Record<string, boolean> | null;
  full_name: string | null;
}

interface UnitRow {
  id: string;
  name: string;
  code: string;
  status: string;
}

/**
 * Sessão atual (usuário logado + perfil de public.profiles + unidade
 * efetiva), ou null se não estiver logado, sem perfil, ou perfil inativo.
 *
 * A lista de unidades vem de `public.units` lida com a sessão do PRÓPRIO
 * usuário (chave anônima + RLS já existente do six_control): quem tem
 * `can_see_all()` no six_control recebe todas; os demais recebem só a
 * própria — não precisamos reimplementar esse filtro aqui.
 */
export async function getBarSession(): Promise<BarSession | null> {
  const supabase = await getAuthClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, unit_id, unit_name, account_status, permissions, full_name')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (!profile || profile.account_status !== 'ativo') return null;

  const permissions = getBarPermissions(profile.role, profile.permissions);

  const { data: unitsData } = await supabase
    .from('units')
    .select('id, name, code, status')
    .eq('status', 'ativo')
    .order('name');
  const units = (unitsData ?? []) as UnitRow[];

  let unitId = profile.unit_id;
  let unitName = profile.unit_name;

  if (permissions.canViewAllUnits) {
    const store = await cookies();
    const selected = store.get(ACTIVE_UNIT_COOKIE)?.value;
    const match = selected ? units.find((u) => u.id === selected) : null;
    if (match) {
      unitId = match.id;
      unitName = match.name;
    } else if (!unitId && units.length > 0) {
      // Master/Sócio sem unidade "de casa" definida: parte da primeira ativa.
      unitId = units[0].id;
      unitName = units[0].name;
    }
  }

  if (!unitId) return null; // sem unidade nenhuma resolvida — não dá pra operar

  const resolvedUnit = units.find((u) => u.id === unitId);

  return {
    userId: user.id,
    role: profile.role,
    fullName: profile.full_name,
    permissions,
    unitId,
    unitName: unitName ?? resolvedUnit?.name ?? '',
    unitCode: resolvedUnit?.code ?? '',
    availableUnits: permissions.canViewAllUnits ? units.map((u) => ({ id: u.id, name: u.name, code: u.code })) : null,
  };
}

/** Garante a permissão certa e devolve a sessão (com unitId resolvido). Lança se não tiver acesso. */
export async function requireRole(area: 'bar' | 'admin'): Promise<BarSession> {
  const session = await getBarSession();
  if (!session) {
    throw new Error('Sessão expirada ou sem permissão. Faça login novamente.');
  }
  const allowed =
    area === 'bar' ? session.permissions.canViewBar : session.permissions.canManageBarCardapio;
  if (!allowed) {
    throw new Error('Você não tem permissão para acessar esta área.');
  }
  return session;
}
