'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/session';

type Result = { ok: boolean; message?: string };

function ok(): Result {
  revalidatePath('/[unit]', 'page');
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

// ─────────── Verificação de posse (item pertence à unidade da sessão?) ───────────
//  menu_items/option_groups/options não têm unit_id próprio — a posse é
//  verificada subindo a cadeia de FKs até bar.categories.unit_id. São
//  ações de admin (baixa frequência), então uma consulta a mais por
//  nível não é um problema de performance real.

async function categoryUnitId(sb: ReturnType<typeof getAdminClient>, categoryId: string) {
  const { data } = await sb.from('categories').select('unit_id').eq('id', categoryId).maybeSingle();
  return data?.unit_id ?? null;
}

async function itemCategoryId(sb: ReturnType<typeof getAdminClient>, itemId: string) {
  const { data } = await sb.from('menu_items').select('category_id').eq('id', itemId).maybeSingle();
  return data?.category_id ?? null;
}

async function groupItemId(sb: ReturnType<typeof getAdminClient>, groupId: string) {
  const { data } = await sb.from('option_groups').select('menu_item_id').eq('id', groupId).maybeSingle();
  return data?.menu_item_id ?? null;
}

async function optionGroupId(sb: ReturnType<typeof getAdminClient>, optionId: string) {
  const { data } = await sb.from('options').select('group_id').eq('id', optionId).maybeSingle();
  return data?.group_id ?? null;
}

async function itemBelongsToUnit(sb: ReturnType<typeof getAdminClient>, itemId: string, unitId: string) {
  const categoryId = await itemCategoryId(sb, itemId);
  if (!categoryId) return false;
  return (await categoryUnitId(sb, categoryId)) === unitId;
}

async function groupBelongsToUnit(sb: ReturnType<typeof getAdminClient>, groupId: string, unitId: string) {
  const itemId = await groupItemId(sb, groupId);
  if (!itemId) return false;
  return itemBelongsToUnit(sb, itemId, unitId);
}

async function optionBelongsToUnit(sb: ReturnType<typeof getAdminClient>, optionId: string, unitId: string) {
  const groupId = await optionGroupId(sb, optionId);
  if (!groupId) return false;
  return groupBelongsToUnit(sb, groupId, unitId);
}

const NOT_FOUND: Result = { ok: false, message: 'Registro não encontrado.' };

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
  const { unitId } = await requireRole('admin');
  if (!input.name?.trim()) return { ok: false, message: 'Informe o nome da categoria.' };
  const sb = getAdminClient();
  const days = input.available_days && input.available_days.length > 0 ? input.available_days : null;
  const { error } = await sb.from('categories').insert({
    unit_id: unitId,
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
  const { unitId } = await requireRole('admin');
  const sb = getAdminClient();
  if ((await categoryUnitId(sb, id)) !== unitId) return NOT_FOUND;

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
  const { unitId } = await requireRole('admin');
  const sb = getAdminClient();
  if ((await categoryUnitId(sb, id)) !== unitId) return NOT_FOUND;

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
  const { unitId } = await requireRole('admin');
  if (!input.name?.trim()) return { ok: false, message: 'Informe o nome do item.' };
  if (!input.category_id) return { ok: false, message: 'Selecione a categoria.' };
  const sb = getAdminClient();
  if ((await categoryUnitId(sb, input.category_id)) !== unitId) {
    return { ok: false, message: 'Categoria inválida.' };
  }

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
  const { unitId } = await requireRole('admin');
  const sb = getAdminClient();
  if (!(await itemBelongsToUnit(sb, id, unitId))) return NOT_FOUND;
  if ((await categoryUnitId(sb, input.category_id)) !== unitId) {
    return { ok: false, message: 'Categoria inválida.' };
  }

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
  const { unitId } = await requireRole('admin');
  const sb = getAdminClient();
  if (!(await itemBelongsToUnit(sb, id, unitId))) return NOT_FOUND;

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
  const { unitId } = await requireRole('admin');
  if (!input.name?.trim()) return { ok: false, message: 'Informe o nome do grupo.' };
  const sb = getAdminClient();
  if (!(await itemBelongsToUnit(sb, input.menu_item_id, unitId))) {
    return { ok: false, message: 'Item inválido.' };
  }

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
  const { unitId } = await requireRole('admin');
  const sb = getAdminClient();
  if (!(await groupBelongsToUnit(sb, id, unitId))) return NOT_FOUND;

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
  const { unitId } = await requireRole('admin');
  const sb = getAdminClient();
  if (!(await groupBelongsToUnit(sb, id, unitId))) return NOT_FOUND;

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
  const { unitId } = await requireRole('admin');
  if (!input.name?.trim()) return { ok: false, message: 'Informe o nome da opção.' };
  const sb = getAdminClient();
  if (!(await groupBelongsToUnit(sb, input.group_id, unitId))) {
    return { ok: false, message: 'Grupo inválido.' };
  }

  const { error } = await sb.from('options').insert({
    group_id: input.group_id,
    name: input.name.trim(),
    price_delta: input.price_delta ?? 0,
    sort_order: input.sort_order ?? 100,
  });
  return error ? fail(error, 'Falha ao criar opção.') : ok();
}

export async function updateOption(id: string, input: OptionInput): Promise<Result> {
  const { unitId } = await requireRole('admin');
  const sb = getAdminClient();
  if (!(await optionBelongsToUnit(sb, id, unitId))) return NOT_FOUND;

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
  const { unitId } = await requireRole('admin');
  const sb = getAdminClient();
  if (!(await optionBelongsToUnit(sb, id, unitId))) return NOT_FOUND;

  const { error } = await sb.from('options').delete().eq('id', id);
  return error ? fail(error, 'Falha ao remover opção.') : ok();
}

// ─────────────────────────── Settings ──────────────────────────────

export async function updateLocations(locations: string[]): Promise<Result> {
  const { unitId } = await requireRole('admin');
  const clean = locations.map((l) => l.trim()).filter(Boolean).slice(0, 40);
  if (clean.length === 0)
    return { ok: false, message: 'Cadastre ao menos um local.' };
  const sb = getAdminClient();
  const { error } = await sb.from('settings').upsert(
    { unit_id: unitId, key: 'locations', value: clean, is_public: true, updated_at: new Date().toISOString() },
    { onConflict: 'unit_id,key' },
  );
  return error ? fail(error, 'Falha ao salvar locais.') : ok();
}

export async function updateAlertMinutes(minutes: number): Promise<Result> {
  const { unitId } = await requireRole('admin');
  const m = Math.min(60, Math.max(1, Math.floor(minutes || 0)));
  const sb = getAdminClient();
  const { error } = await sb.from('settings').upsert(
    { unit_id: unitId, key: 'alert_minutes', value: m, is_public: true, updated_at: new Date().toISOString() },
    { onConflict: 'unit_id,key' },
  );
  return error ? fail(error, 'Falha ao salvar tempo de alerta.') : ok();
}

// ─────────────────── Cardápio entre unidades (bootstrap) ────────────

/**
 * Clona o cardápio de uma unidade de origem pra outra (unidade alvo) — só
 * pra quem tem canViewAllUnits (Master/Sócio), já que mexe em unidade que
 * não é necessariamente a da própria sessão. Marca a unidade alvo com
 * `menu_review_pending = true`: a faixa de aviso no /admin dessa unidade
 * só some quando alguém confirmar que revisou (markMenuReviewed, em
 * actions/bar.ts).
 */
export async function cloneMenuToUnit(
  sourceUnitId: string,
  targetUnitId: string,
): Promise<Result> {
  const session = await requireRole('admin');
  if (!session.permissions.canViewAllUnits) {
    return { ok: false, message: 'Sem permissão para clonar cardápio entre unidades.' };
  }
  if (sourceUnitId === targetUnitId) {
    return { ok: false, message: 'Escolha uma unidade de destino diferente da origem.' };
  }

  const sb = getAdminClient();

  const { count } = await sb
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('unit_id', targetUnitId);
  if (count && count > 0) {
    return { ok: false, message: 'Essa unidade já tem cardápio cadastrado.' };
  }

  const { error } = await sb.rpc('clone_menu_to_unit', {
    p_source_unit: sourceUnitId,
    p_target_unit: targetUnitId,
  });
  if (error) return fail(error, 'Falha ao clonar o cardápio.');

  await sb.from('settings').upsert(
    {
      unit_id: targetUnitId,
      key: 'menu_review_pending',
      value: true,
      is_public: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'unit_id,key' },
  );

  return ok();
}
