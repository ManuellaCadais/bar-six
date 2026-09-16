/**
 * Porta LOCAL (não importada, não linkada) da regra de permissões do
 * six_control (src/lib/permissions.js) — só a REGRA e os papéis, porque
 * bar-six e six_control são repositórios separados que só compartilham o
 * mesmo projeto Supabase (mesma auth.users / public.profiles).
 *
 * Só as flags que este app realmente usa entram aqui:
 *  - canViewBar: vê o card no portal do SIX OS + entra em /bar (fila).
 *  - canManageBarCardapio: entra em /admin (cardápio, ajustes, abre/fecha
 *    o bar) — mais sensível que canViewBar.
 *  - canViewValet: entra em /valet (fila de carros, fotos, entrega).
 *  - canManageValet: liga/desliga o valet da unidade.
 *  - canViewAllUnits: mesmo conceito do six_control — quem tem essa flag
 *    enxerga/alterna entre TODAS as unidades em vez de ficar travado na
 *    própria (via profile.unit_id).
 *
 * Se um dia precisar de outra flag do six_control, ela entra aqui do
 * mesmo jeito — copiada, não importada.
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
  canViewValet: boolean;
  canManageValet: boolean;
  canViewAllUnits: boolean;
}

const NONE: BarPermissions = {
  canViewBar: false,
  canManageBarCardapio: false,
  canViewValet: false,
  canManageValet: false,
  canViewAllUnits: false,
};

const BASE: Record<Role, BarPermissions> = {
  global_total: { canViewBar: true, canManageBarCardapio: true, canViewValet: true, canManageValet: true, canViewAllUnits: true },
  total: { canViewBar: true, canManageBarCardapio: true, canViewValet: true, canManageValet: true, canViewAllUnits: false },
  socio: { ...NONE, canViewBar: true, canViewValet: true, canViewAllUnits: true },
  administrativo: { ...NONE },
  lideranca: { ...NONE },
  auditoria: { ...NONE, canViewAllUnits: true },
  contabilidade: { ...NONE, canViewAllUnits: true },
  funcionario: { ...NONE },
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
      canViewValet: overrides.canViewValet ?? base.canViewValet,
      canManageValet: overrides.canManageValet ?? base.canManageValet,
      canViewAllUnits: base.canViewAllUnits, // não faz sentido um funcionário ganhar isso por override
    };
  }
  return { ...base };
}

export type Area = 'bar' | 'admin' | 'valet';

/** Permissão que libera cada área protegida. */
export function canEnter(area: Area, p: BarPermissions): boolean {
  if (area === 'bar') return p.canViewBar;
  if (area === 'admin') return p.canManageBarCardapio;
  return p.canViewValet;
}
