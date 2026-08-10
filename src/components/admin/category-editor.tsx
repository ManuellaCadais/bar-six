'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { WEEKDAYS_SHORT_PT } from '@/lib/constants';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryInput,
} from '@/lib/actions/admin';
import type { Category, CategoryWithItems } from '@/lib/types';
import { useAction } from './use-action';
import { ItemEditor, NewItem } from './item-editor';

function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(d: number) {
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort());
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS_SHORT_PT.map((label, d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs uppercase tracking-wide transition',
              value.includes(d)
                ? 'border-cream bg-cream/15 text-cream'
                : 'border-hairline text-text-low',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[0.68rem] text-text-low">
        Nenhum selecionado = disponível todos os dias.
      </p>
    </div>
  );
}

function CategoryForm({
  mode,
  categoryId,
  initial,
}: {
  mode: 'create' | 'edit';
  categoryId?: string;
  initial: Partial<Category>;
}) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState(initial.name ?? '');
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? '');
  const [note, setNote] = useState(initial.note ?? '');
  const [color, setColor] = useState(initial.color ?? '#E9DCC3');
  const [sort, setSort] = useState(String(initial.sort_order ?? 100));
  const [days, setDays] = useState<number[]>(initial.available_days ?? []);
  const [sig, setSig] = useState(initial.is_signature ?? false);

  function build(): CategoryInput {
    return {
      name,
      subtitle: subtitle || null,
      note: note || null,
      color,
      sort_order: Number(sort) || 100,
      available_days: days.length > 0 ? days : null,
      is_signature: sig,
    };
  }

  function save() {
    run(
      () => (mode === 'create' ? createCategory(build()) : updateCategory(categoryId!, build())),
      () => {
        if (mode === 'create') {
          setName('');
          setSubtitle('');
          setNote('');
        }
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="field-label">Nome</label>
          <input className="field-input py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Subtítulo</label>
          <input
            className="field-input py-2"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Nota (ex.: dias de disponibilidade)</label>
          <input className="field-input py-2" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Cor de acento</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-14 rounded-lg border border-hairline bg-surface-2"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <input
              className="field-input py-2 flex-1"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="field-label">Ordem</label>
          <input
            className="field-input py-2"
            inputMode="numeric"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="field-label">Dias disponíveis</label>
        <WeekdayPicker value={days} onChange={setDays} />
      </div>

      <label className="flex items-center gap-2 text-sm text-text-mid">
        <input type="checkbox" checked={sig} onChange={(e) => setSig(e.target.checked)} />
        Seção assinatura (destaque escuro, serifa itálica)
      </label>

      {error && <p className="text-sm text-strawberry">{error}</p>}

      <button className="btn-primary px-5 py-2.5 text-xs" disabled={pending || !name.trim()} onClick={save}>
        {mode === 'create' ? 'Criar categoria' : 'Salvar categoria'}
      </button>
    </div>
  );
}

export function CategoryEditor({
  category,
  categories,
}: {
  category: CategoryWithItems;
  categories: Category[];
}) {
  const { pending, run } = useAction();
  const [editing, setEditing] = useState(false);

  return (
    <section className="surface-card p-4 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="plate-bullet flex-none" style={{ color: category.color }} />
          <h2 className="truncate font-heading text-xl uppercase tracking-wide text-text-hi">
            {category.name}
          </h2>
          <span className="flex-none text-xs text-text-low">({category.items.length})</span>
          {category.is_signature && (
            <span className="flex-none chip border-cream/40 text-cream text-[0.6rem]">assinatura</span>
          )}
        </div>
        <button
          className="btn-ghost flex-none px-4 py-2 text-xs"
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? 'Fechar' : 'Editar'}
        </button>
      </header>

      {editing && (
        <div className="mt-4 space-y-4 border-t border-hairline pt-4">
          <CategoryForm mode="edit" categoryId={category.id} initial={category} />
          <button
            className="btn-danger px-4 py-2 text-xs"
            disabled={pending}
            onClick={() => {
              if (
                confirm(
                  `Remover a categoria "${category.name}" e TODOS os seus itens?`,
                )
              )
                run(() => deleteCategory(category.id));
            }}
          >
            Remover categoria
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {category.items.map((it) => (
          <ItemEditor key={it.id} item={it} categories={categories} />
        ))}
        <NewItem categoryId={category.id} categories={categories} />
      </div>
    </section>
  );
}

export function NewCategory() {
  const [open, setOpen] = useState(false);
  return (
    <section className="surface-card p-4 sm:p-5">
      <button
        className="w-full text-left font-heading text-sm uppercase tracking-widest text-cream"
        onClick={() => setOpen((o) => !o)}
      >
        + Nova categoria
      </button>
      {open && (
        <div className="mt-4 border-t border-hairline pt-4">
          <CategoryForm mode="create" initial={{ color: '#E9DCC3', sort_order: 100 }} />
        </div>
      )}
    </section>
  );
}
