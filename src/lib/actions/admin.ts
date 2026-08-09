'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/session';

type Result = { ok: boolean; message?: string };

function ok(): Result {
  revalidatePath('/');
  revalidatePath('/admin');
  return { ok: true };
}

function fail(error: unknown, fallback: string): Result {
  const msg = typeof error === 'object' && error && 'message' in error
    ? String((error as { message: string }).message)
    : '';
  if (msg.includes('duplicate') || msg.includes('unique'))
    return { ok: false, message: 'Já existe um registro com esse nome/slug.' };
  return { ok: false, message: fallback };
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

// ───────────────────────── Categorias ──────────────────────────────

export interface CategoryInput {
  name: string;
  subtitle?: string | null;
  note?: string | null;
  color?: string;
  sort_order?: number;
  available_days?: number[] | null;
  is_signature?: boolean;
}

export async function createCategory(input: CategoryInput): Promise<Result> {
  await requireRole('admin');
  if (!input.name?.trim()) return { ok: false, message: 'Informe o nome da categoria.' };
  const sb = getAdminClient();
  const days = input.available_days && input.available_days.length > 0 ? input.available_days : null;
  const { error } = await sb.from('categories').insert({
    name: input.name.trim(),
    slug: slugify(input.name),
    subtitle: input.subtitle?.trim() || null,
    note: input.note?.trim() || null,
    color: input.color || '#E9DCC3',
    sort_order: input.sort_order ?? 100,
    available_days: days,
    is_signature: input.is_signature ?? false,
  });
  return error ? fail(error, 'Falha ao criar categoria.') : ok();
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<Result> {
  await requireRole('admin');
  const sb = getAdminClient();
  const days = input.available_days && input.available_days.length > 0 ? input.available_days : null;
  const { error } = await sb
    .from('categories')
    .update({
      name: input.name.trim(),
      subtitle: input.subtitle?.trim() || null,
      note: input.note?.trim() || null,
      color: input.color || '#E9DCC3',
      sort_order: input.sort_order ?? 100,
      available_days: days,
      is_signature: input.is_signature ?? false,
    })
    .eq('id', id);
  return error ? fail(error, 'Falha ao atualizar categoria.') : ok();
}

export async function deleteCategory(id: string): Promise<Result> {
  await requireRole('admin');
  const sb = getAdminClient();
  const { error } = await sb.from('categories').delete().eq('id', id);
  return error ? fail(error, 'Falha ao remover categoria.') : ok();
}

// ─────────────────────────── Itens ─────────────────────────────────

export interface ItemInput {
  category_id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  image_url?: string | null;
  is_available?: boolean;
  is_alcoholic?: boolean;
  is_signature?: boolean;
  stars?: number | null;
  sort_order?: number;
}

export async function createItem(input: ItemInput): Promise<Result> {
  await requireRole('admin');
  if (!input.name?.trim()) return { ok: false, message: 'Informe o nome do item.' };
  if (!input.category_id) return { ok: false, message: 'Selecione a categoria.' };
  const sb = getAdminClient();
  const { error } = await sb.from('menu_items').insert({
    category_id: input.category_id,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: input.price ?? null,
    image_url: input.image_url?.trim() || null,
    is_available: input.is_available ?? true,
    is_alcoholic: input.is_alcoholic ?? false,
    is_signature: input.is_signature ?? false,
    stars: input.stars ?? null,
    sort_order: input.sort_order ?? 100,
  });
  return error ? fail(error, 'Falha ao criar item.') : ok();
}

export async function updateItem(id: string, input: ItemInput): Promise<Result> {
  await requireRole('admin');
  const sb = getAdminClient();
  const { error } = await sb
    .from('menu_items')
    .update({
      category_id: input.category_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price ?? null,
      image_url: input.image_url?.trim() || null,
      is_available: input.is_available ?? true,
      is_alcoholic: input.is_alcoholic ?? false,
      is_signature: input.is_signature ?? false,
      stars: input.stars ?? null,
      sort_order: input.sort_order ?? 100,
    })
    .eq('id', id);
  return error ? fail(error, 'Falha ao atualizar item.') : ok();
}

export async function deleteItem(id: string): Promise<Result> {
  await requireRole('admin');
  const sb = getAdminClient();
  const { error } = await sb.from('menu_items').delete().eq('id', id);
  return error ? fail(error, 'Falha ao remover item.') : ok();
}

// ────────────────────── Grupos de personalização ───────────────────

export interface GroupInput {
  menu_item_id: string;
  name: string;
  kind: 'single' | 'multiple';
  required: boolean;
  sort_order?: number;
}

export async function createGroup(input: GroupInput): Promise<Result> {
  await requireRole('admin');
  if (!input.name?.trim()) return { ok: false, message: 'Informe o nome do grupo.' };
  const sb = getAdminClient();
  const { error } = await sb.from('option_groups').insert({
    menu_item_id: input.menu_item_id,
    name: input.name.trim(),
    kind: input.kind,
    required: input.required,
    sort_order: input.sort_order ?? 100,
  });
  return error ? fail(error, 'Falha ao criar grupo.') : ok();
}

export async function updateGroup(id: string, input: GroupInput): Promise<Result> {
  await requireRole('admin');
  const sb = getAdminClient();
  const { error } = await sb
    .from('option_groups')
    .update({
      name: input.name.trim(),
      kind: input.kind,
      required: input.required,
      sort_order: input.sort_order ?? 100,
    })
    .eq('id', id);
  return error ? fail(error, 'Falha ao atualizar grupo.') : ok();
}

export async function deleteGroup(id: string): Promise<Result> {
  await requireRole('admin');
  const sb = getAdminClient();
  const { error } = await sb.from('option_groups').delete().eq('id', id);
  return error ? fail(error, 'Falha ao remover grupo.') : ok();
}

// ──────────────────────────── Opções ───────────────────────────────

export interface OptionInput {
  group_id: string;
  name: string;
  price_delta?: number;
  sort_order?: number;
}

export async function createOption(input: OptionInput): Promise<Result> {
  await requireRole('admin');
  if (!input.name?.trim()) return { ok: false, message: 'Informe o nome da opção.' };
  const sb = getAdminClient();
  const { error } = await sb.from('options').insert({
    group_id: input.group_id,
    name: input.name.trim(),
    price_delta: input.price_delta ?? 0,
    sort_order: input.sort_order ?? 100,
  });
  return error ? fail(error, 'Falha ao criar opção.') : ok();
}

export async function updateOption(id: string, input: OptionInput): Promise<Result> {
  await requireRole('admin');
  const sb = getAdminClient();
  const { error } = await sb
    .from('options')
    .update({
      name: input.name.trim(),
      price_delta: input.price_delta ?? 0,
      sort_order: input.sort_order ?? 100,
    })
    .eq('id', id);
  return error ? fail(error, 'Falha ao atualizar opção.') : ok();
}

export async function deleteOption(id: string): Promise<Result> {
  await requireRole('admin');
  const sb = getAdminClient();
  const { error } = await sb.from('options').delete().eq('id', id);
  return error ? fail(error, 'Falha ao remover opção.') : ok();
}

// ─────────────────────────── Settings ──────────────────────────────

export async function updateLocations(locations: string[]): Promise<Result> {
  await requireRole('admin');
  const clean = locations.map((l) => l.trim()).filter(Boolean).slice(0, 40);
  if (clean.length === 0)
    return { ok: false, message: 'Cadastre ao menos um local.' };
  const sb = getAdminClient();
  const { error } = await sb.from('settings').upsert(
    { key: 'locations', value: clean, is_public: true, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  return error ? fail(error, 'Falha ao salvar locais.') : ok();
}

export async function updateAlertMinutes(minutes: number): Promise<Result> {
  await requireRole('admin');
  const m = Math.min(60, Math.max(1, Math.floor(minutes || 0)));
  const sb = getAdminClient();
  const { error } = await sb.from('settings').upsert(
    { key: 'alert_minutes', value: m, is_public: true, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  return error ? fail(error, 'Falha ao salvar tempo de alerta.') : ok();
}
