'use client';

import { useTransition } from 'react';
import { setActiveUnit } from '@/lib/actions/auth';
import type { UnitOption } from '@/lib/session';

/**
 * Seletor de unidade — só aparece pra quem tem canViewAllUnits
 * (Master/Sócio). Troca a unidade (cookie six_active_unit) e recarrega a
 * página, pra garantir que TODO o estado (servidor + cliente) reflita a
 * unidade nova, sem risco de misturar dado de duas unidades na tela.
 */
export function UnitSwitcher({ current, units }: { current: string; units: UnitOption[] }) {
  const [pending, startTransition] = useTransition();

  function change(unitId: string) {
    if (unitId === current) return;
    startTransition(async () => {
      const r = await setActiveUnit(unitId);
      if (r.ok) window.location.reload();
    });
  }

  return (
    <select
      className="chip border border-hairline bg-transparent px-3 py-2 text-xs uppercase tracking-widest text-text-hi"
      value={current}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      aria-label="Trocar de unidade"
    >
      {units.map((u) => (
        <option key={u.id} value={u.id} className="bg-ink text-text-hi">
          {u.name}
        </option>
      ))}
    </select>
  );
}
