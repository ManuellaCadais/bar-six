'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import {
  createGroup,
  updateGroup,
  deleteGroup,
  createOption,
  updateOption,
  deleteOption,
} from '@/lib/actions/admin';
import type { OptionGroup, OptionRow } from '@/lib/types';
import { useAction } from './use-action';

function OptionRowEditor({ option }: { option: OptionRow }) {
  const { pending, run } = useAction();
  const [name, setName] = useState(option.name);
  const [delta, setDelta] = useState(String(option.price_delta || 0));

  return (
    <div className="flex items-center gap-2">
      <input
        className="field-input flex-1 py-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="field-input w-24 py-2"
        type="number"
        step="0.5"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        title="Acréscimo (R$)"
      />
      <button
        className="btn-ghost px-3 py-2 text-xs"
        disabled={pending}
        onClick={() =>
          run(() =>
            updateOption(option.id, {
              group_id: option.group_id,
              name,
              price_delta: Number(delta) || 0,
              sort_order: option.sort_order,
            }),
          )
        }
      >
        Salvar
      </button>
      <button
        className="btn-danger px-3 py-2 text-xs"
        disabled={pending}
        onClick={() => run(() => deleteOption(option.id))}
        aria-label="Remover opção"
      >
        ✕
      </button>
    </div>
  );
}

function NewOption({ groupId }: { groupId: string }) {
  const { pending, run } = useAction();
  const [name, setName] = useState('');
  const [delta, setDelta] = useState('');

  return (
    <div className="flex items-center gap-2">
      <input
        className="field-input flex-1 py-2"
        placeholder="Nova opção (ex.: Avelã)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="field-input w-24 py-2"
        type="number"
        step="0.5"
        placeholder="+R$"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
      />
      <button
        className="btn-primary px-3 py-2 text-xs"
        disabled={pending || !name.trim()}
        onClick={() =>
          run(
            () =>
              createOption({
                group_id: groupId,
                name,
                price_delta: Number(delta) || 0,
              }),
            () => {
              setName('');
              setDelta('');
            },
          )
        }
      >
        Adicionar
      </button>
    </div>
  );
}

export function GroupEditor({ group }: { group: OptionGroup }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [kind, setKind] = useState<'single' | 'multiple'>(group.kind);
  const [required, setRequired] = useState(group.required);

  return (
    <div className="rounded-xl border border-hairline bg-ink/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          className="flex-1 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="font-heading uppercase tracking-wide text-sm text-text-hi">
            {group.name}
          </span>
          <span className="ml-2 text-xs text-text-low">
            {group.kind === 'single' ? 'única' : 'múltipla'}
            {group.required ? ' · obrigatória' : ' · opcional'} ·{' '}
            {group.options.length} opções
          </span>
        </button>
        <span className={cn('text-text-low transition', open && 'rotate-90')}>›</span>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-hairline pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input
              className="field-input py-2 sm:col-span-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do grupo"
            />
            <select
              className="field-input py-2"
              value={kind}
              onChange={(e) => setKind(e.target.value as 'single' | 'multiple')}
            >
              <option value="single">Escolha única</option>
              <option value="multiple">Múltipla</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-text-mid">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              Obrigatória
            </label>
          </div>

          <div className="flex gap-2">
            <button
              className="btn-ghost px-4 py-2 text-xs"
              disabled={pending}
              onClick={() =>
                run(() =>
                  updateGroup(group.id, {
                    menu_item_id: group.menu_item_id,
                    name,
                    kind,
                    required,
                    sort_order: group.sort_order,
                  }),
                )
              }
            >
              Salvar grupo
            </button>
            <button
              className="btn-danger px-4 py-2 text-xs"
              disabled={pending}
              onClick={() => run(() => deleteGroup(group.id))}
            >
              Remover grupo
            </button>
          </div>

          <div className="space-y-2">
            {group.options.map((o) => (
              <OptionRowEditor key={o.id} option={o} />
            ))}
            <NewOption groupId={group.id} />
          </div>

          {error && <p className="text-sm text-strawberry">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function NewGroup({ itemId }: { itemId: string }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'single' | 'multiple'>('single');
  const [required, setRequired] = useState(true);

  return (
    <div className="rounded-xl border border-dashed border-hairline-strong p-3">
      <p className="field-label">Novo grupo de personalização</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          className="field-input py-2 sm:col-span-2"
          placeholder="Ex.: Xarope Monin"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="field-input py-2"
          value={kind}
          onChange={(e) => setKind(e.target.value as 'single' | 'multiple')}
        >
          <option value="single">Escolha única</option>
          <option value="multiple">Múltipla</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-text-mid">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Obrigatória
        </label>
      </div>
      <button
        className="btn-primary mt-2 px-4 py-2 text-xs"
        disabled={pending || !name.trim()}
        onClick={() =>
          run(
            () => createGroup({ menu_item_id: itemId, name, kind, required }),
            () => setName(''),
          )
        }
      >
        Criar grupo
      </button>
      {error && <p className="mt-1 text-sm text-strawberry">{error}</p>}
    </div>
  );
}
