'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { createItem, updateItem, deleteItem, type ItemInput } from '@/lib/actions/admin';
import type { Category, MenuItem } from '@/lib/types';
import { useAction } from './use-action';
import { GroupEditor, NewGroup } from './group-editor';

function parsePrice(v: string): number | null {
  const t = v.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function ItemForm({
  mode,
  itemId,
  categories,
  initial,
  onCreated,
}: {
  mode: 'create' | 'edit';
  itemId?: string;
  categories: Category[];
  initial: Partial<ItemInput>;
  onCreated?: () => void;
}) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState(initial.name ?? '');
  const [categoryId, setCategoryId] = useState(initial.category_id ?? categories[0]?.id ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [price, setPrice] = useState(initial.price != null ? String(initial.price) : '');
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? '');
  const [stars, setStars] = useState(initial.stars != null ? String(initial.stars) : '');
  const [avail, setAvail] = useState(initial.is_available ?? true);
  const [alco, setAlco] = useState(initial.is_alcoholic ?? false);
  const [sig, setSig] = useState(initial.is_signature ?? false);
  const [sort, setSort] = useState(String(initial.sort_order ?? 100));

  function build(): ItemInput {
    return {
      category_id: categoryId,
      name,
      description: description || null,
      price: parsePrice(price),
      image_url: imageUrl || null,
      stars: stars.trim() === '' ? null : Number(stars),
      is_available: avail,
      is_alcoholic: alco,
      is_signature: sig,
      sort_order: Number(sort) || 100,
    };
  }

  function save() {
    run(
      () => (mode === 'create' ? createItem(build()) : updateItem(itemId!, build())),
      () => {
        if (mode === 'create') {
          setName('');
          setDescription('');
          setPrice('');
          setStars('');
        }
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Nome</label>
          <input className="field-input py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Categoria</label>
          <select
            className="field-input py-2"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Preço (R$ · deixe vazio p/ ocultar)</label>
          <input
            className="field-input py-2"
            inputMode="decimal"
            placeholder="—"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Descrição</label>
          <textarea
            className="field-input resize-none py-2"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">URL da foto (opcional)</label>
          <input
            className="field-input py-2"
            placeholder="https://…"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Estrelas (selo · vazio = nenhum)</label>
          <input
            className="field-input py-2"
            inputMode="numeric"
            placeholder="—"
            value={stars}
            onChange={(e) => setStars(e.target.value)}
          />
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

      <div className="flex flex-wrap gap-4 text-sm text-text-mid">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={avail} onChange={(e) => setAvail(e.target.checked)} />
          Disponível
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={alco} onChange={(e) => setAlco(e.target.checked)} />
          Alcoólico (+18)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={sig} onChange={(e) => setSig(e.target.checked)} />
          Assinatura (card destaque)
        </label>
      </div>

      {error && <p className="text-sm text-strawberry">{error}</p>}

      <button className="btn-primary px-5 py-2.5 text-xs" disabled={pending || !name.trim()} onClick={save}>
        {mode === 'create' ? 'Criar item' : 'Salvar item'}
      </button>
    </div>
  );
}

export function ItemEditor({
  item,
  categories,
}: {
  item: MenuItem;
  categories: Category[];
}) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const price = formatPrice(item.price);

  return (
    <div className="rounded-xl border border-hairline bg-surface/70">
      <div className="flex items-center gap-3 px-4 py-3">
        <button className="flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                item.is_available ? 'bg-cream' : 'bg-white/20',
              )}
            />
            <span className="font-heading uppercase tracking-wide text-text-hi">
              {item.name}
            </span>
            {item.is_alcoholic && <span className="tag-18">+18</span>}
          </span>
          <span className="mt-0.5 block text-xs text-text-low">
            {item.option_groups.length} personalizações
            {price ? ` · ${price}` : ' · sem preço'}
            {!item.is_available ? ' · indisponível' : ''}
          </span>
        </button>
        <span className={cn('text-text-low transition', open && 'rotate-90')}>›</span>
      </div>

      {open && (
        <div className="space-y-4 border-t border-hairline p-4">
          <ItemForm mode="edit" itemId={item.id} categories={categories} initial={item} />

          <div>
            <p className="field-label">Personalizações</p>
            <div className="space-y-2">
              {item.option_groups.map((g) => (
                <GroupEditor key={g.id} group={g} />
              ))}
              <NewGroup itemId={item.id} />
            </div>
          </div>

          <button
            className="btn-danger px-4 py-2 text-xs"
            disabled={pending}
            onClick={() => {
              if (confirm(`Remover o item "${item.name}"?`)) run(() => deleteItem(item.id));
            }}
          >
            Remover item
          </button>
        </div>
      )}
    </div>
  );
}

export function NewItem({
  categoryId,
  categories,
}: {
  categoryId: string;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-dashed border-hairline-strong">
      <button
        className="w-full px-4 py-3 text-left font-heading text-xs uppercase tracking-widest text-cream"
        onClick={() => setOpen((o) => !o)}
      >
        + Novo item
      </button>
      {open && (
        <div className="border-t border-hairline p-4">
          <ItemForm
            mode="create"
            categories={categories}
            initial={{ category_id: categoryId, is_available: true }}
          />
        </div>
      )}
    </div>
  );
}
