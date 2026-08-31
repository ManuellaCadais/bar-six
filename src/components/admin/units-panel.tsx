'use client';

import { useState, useTransition } from 'react';
import { cloneMenuToUnit } from '@/lib/actions/admin';
import type { UnitOption } from '@/lib/session';

/**
 * Clonar cardápio entre unidades — só aparece pra quem tem
 * canViewAllUnits (Master/Sócio). O servidor recusa clonar pra uma
 * unidade que já tem cardápio (categorias > 0), então não precisamos
 * adivinhar aqui quais unidades estão vazias.
 */
export function UnitsPanel({
  currentUnitId,
  units,
}: {
  currentUnitId: string;
  units: UnitOption[];
}) {
  const [source, setSource] = useState(currentUnitId);
  const [target, setTarget] = useState('');
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function clone() {
    if (!target) {
      setMessage({ ok: false, text: 'Escolha a unidade de destino.' });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const r = await cloneMenuToUnit(source, target);
      setMessage({
        ok: r.ok,
        text: r.ok
          ? 'Cardápio clonado. A unidade de destino já mostra uma faixa de aviso pra revisar.'
          : (r.message ?? 'Falha ao clonar.'),
      });
      if (r.ok) setTarget('');
    });
  }

  return (
    <div className="surface-card max-w-xl p-5">
      <h2 className="eyebrow text-[0.6rem] mb-1">Cadastrar cardápio de outra unidade</h2>
      <p className="mb-4 text-sm text-text-mid">
        Clona categorias, itens e personalizações de uma unidade com cardápio pronto pra outra
        que ainda não tem nenhum — um ponto de partida pra editar depois. Só funciona se a
        unidade de destino estiver totalmente vazia.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label">Copiar de</label>
          <select
            className="field-input py-2"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Para</label>
          <select
            className="field-input py-2"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Selecione a unidade…</option>
            {units
              .filter((u) => u.id !== source)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <button className="btn-primary mt-4 px-5 py-2.5 text-xs" onClick={clone} disabled={pending}>
        {pending ? 'Clonando…' : 'Clonar cardápio'}
      </button>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-cream' : 'text-strawberry'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
