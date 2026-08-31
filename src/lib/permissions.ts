/**
 * Porta LOCAL (não importada, não linkada) da regra de permissões do
 * six_control (src/lib/permissions.js) — só a REGRA e os papéis, porque
 * bar-six e six_control são repositórios separados que só compartilham o
 * mesmo projeto Supabase (mesma auth.users / public.profiles).
 *
 * Só as flags que o bar-six realmente usa entram aqui:
 *  - canViewBar: vê o card no portal do SIX OS + entra em /bar (fila).
 *  - canManageBarCardapio: entra em /admin (cardápio, ajustes, abre/fecha
 *    o bar) — mais sensível que canViewBar.
 *  - canViewAllUnits: mesmo conceito do six_control — quem tem essa flag
 *    enxerga/alterna entre TODAS as unidades em vez de ficar travado na
 *    própria (via profile.unit_id).
 *
 * Se um dia o bar-six precisar de outra flag do six_control, ela entra
 * aqui do mesmo jeito — copiada, não importada.
 */

export type Role =
  | 'global_total' // Master
  | 'total' // Gestor de Unidade
  | 'administrativo'
  | 'lideranca'
  | 'funcionario'
  | 'auditoria'
  | 'socio' // Sócio
  | 'contabilidade';

export interface BarPermissions {
  canViewBar: boolean;
  canManageBarCardapio: boolean;
  canViewAllUnits: boolean;
}

const BASE: Record<Role, BarPermissions> = {
  global_total: { canViewBar: true, canManageBarCardapio: true, canViewAllUnits: true },
  total: { canViewBar: true, canManageBarCardapio: true, canViewAllUnits: false },
  socio: { canViewBar: true, canManageBarCardapio: false, canViewAllUnits: true },
  administrativo: { canViewBar: false, canManageBarCardapio: false, canViewAllUnits: false },
  lideranca: { canViewBar: false, canManageBarCardapio: false, canViewAllUnits: false },
  auditoria: { canViewBar: false, canManageBarCardapio: false, canViewAllUnits: true },
  contabilidade: { canViewBar: false, canManageBarCardapio: false, canViewAllUnits: true },
  funcionario: { canViewBar: false, canManageBarCardapio: false, canViewAllUnits: false },
};

/**
 * Mesma regra do six_control: ajustes individuais em `profile.permissions`
 * SÓ valem pra role 'funcionario' — os demais papéis usam o conjunto cheio
 * do papel, sem override possível (evita um Gestor "se rebaixar" ou um
 * funcionário herdar override de outro papel por engano).
 */
export function getBarPermissions(
  role: string,
  overrides?: Record<string, boolean> | null,
): BarPermissions {
  const base = BASE[role as Role] ?? BASE.funcionario;
  if (role === 'funcionario' && overrides && typeof overrides === 'object') {
    return {
      canViewBar: overrides.canViewBar ?? base.canViewBar,
      canManageBarCardapio: overrides.canManageBarCardapio ?? base.canManageBarCardapio,
      canViewAllUnits: base.canViewAllUnits, // não faz sentido um funcionário ganhar isso por override
    };
  }
  return { ...base };
}
