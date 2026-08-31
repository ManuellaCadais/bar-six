'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/session';
import { nextStatus } from '@/lib/constants';
import { barNow } from '@/lib/datetime';
import type { OrderStatus } from '@/lib/types';

type Result = { ok: boolean; message?: string };

/** Avança o pedido para o próximo status do fluxo. */
export async function advanceOrderStatus(
  orderId: string,
): Promise<Result & { status?: OrderStatus }> {
  const { unitId } = await requireRole('bar');
  const sb = getAdminClient();
  const { data: cur } = await sb
    .from('orders')
    .select('status, seen_at')
    .eq('id', orderId)
    .eq('unit_id', unitId)
    .maybeSingle();
  if (!cur) return { ok: false, message: 'Pedido não encontrado.' };

  const nxt = nextStatus(cur.status as OrderStatus);
  if (!nxt) return { ok: false, message: 'Pedido já finalizado.' };

  // Avançar o status é, por si só, uma confirmação de que o bar viu o pedido
  // — evita o alarme continuar tocando se o toque foi direto no botão de status.
  const { error } = await sb
    .from('orders')
    .update({ status: nxt, seen_at: cur.seen_at ?? new Date().toISOString() })
    .eq('id', orderId)
    .eq('unit_id', unitId);
  if (error) return { ok: false, message: 'Falha ao atualizar o status.' };
  return { ok: true, status: nxt };
}

/** Confirma que o bar viu o pedido — silencia o alarme sonoro para ele. */
export async function markOrderSeen(orderId: string): Promise<Result> {
  const { unitId } = await requireRole('bar');
  const sb = getAdminClient();
  const { error } = await sb
    .from('orders')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('unit_id', unitId)
    .is('seen_at', null);
  return error ? { ok: false, message: 'Falha ao confirmar.' } : { ok: true };
}

/** Volta o pedido um passo (correção de toque acidental). */
export async function revertOrderStatus(
  orderId: string,
): Promise<Result & { status?: OrderStatus }> {
  const { unitId } = await requireRole('bar');
  const flow: OrderStatus[] = ['recebido', 'preparo', 'pronto', 'entregue'];
  const sb = getAdminClient();
  const { data: cur } = await sb
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('unit_id', unitId)
    .maybeSingle();
  if (!cur) return { ok: false, message: 'Pedido não encontrado.' };
  const i = flow.indexOf(cur.status as OrderStatus);
  if (i <= 0) return { ok: false, message: 'Não é possível voltar.' };
  const prev = flow[i - 1];
  const { error } = await sb
    .from('orders')
    .update({ status: prev })
    .eq('id', orderId)
    .eq('unit_id', unitId);
  if (error) return { ok: false, message: 'Falha ao reverter.' };
  return { ok: true, status: prev };
}

export async function cancelOrder(orderId: string, reason: string): Promise<Result> {
  const { unitId } = await requireRole('bar');
  const sb = getAdminClient();
  const clean = (reason ?? '').trim().slice(0, 200) || 'Cancelado pelo bar.';
  // Só cancela pedidos ativos da PRÓPRIA unidade — nunca sobrescreve um já
  // entregue/cancelado, nem um pedido de outra unidade.
  const { data, error } = await sb
    .from('orders')
    .update({ status: 'cancelado', cancel_reason: clean })
    .eq('id', orderId)
    .eq('unit_id', unitId)
    .in('status', ['recebido', 'preparo', 'pronto'])
    .select('id');
  if (error) return { ok: false, message: 'Falha ao cancelar.' };
  if (!data || data.length === 0)
    return { ok: false, message: 'Pedido já finalizado — não é possível cancelar.' };
  return { ok: true };
}

/** Marca item disponível/indisponível (some do cardápio na hora). */
export async function toggleItemAvailability(
  itemId: string,
  available: boolean,
): Promise<Result> {
  const { unitId } = await requireRole('bar');
  const sb = getAdminClient();

  // menu_items não tem unit_id próprio — confirma que o item pertence a
  // uma categoria da PRÓPRIA unidade antes de mexer (evita alterar item
  // de outra unidade só por saber o id). Duas consultas simples em vez de
  // um filtro em relação aninhada, pra não depender de sintaxe PostgREST
  // que varia entre versões.
  const { data: item } = await sb
    .from('menu_items')
    .select('id, category_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!item) return { ok: false, message: 'Item não encontrado.' };

  const { data: category } = await sb
    .from('categories')
    .select('id')
    .eq('id', item.category_id)
    .eq('unit_id', unitId)
    .maybeSingle();
  if (!category) return { ok: false, message: 'Item não encontrado.' };

  const { error } = await sb
    .from('menu_items')
    .update({ is_available: available })
    .eq('id', itemId);
  revalidatePath('/[unit]', 'page');
  return error ? { ok: false, message: 'Falha ao atualizar item.' } : { ok: true };
}

/** Grava (ou atualiza) uma chave de settings da unidade da sessão atual. */
async function upsertSetting(unitId: string, key: string, value: unknown): Promise<Result> {
  const sb = getAdminClient();
  const { error } = await sb.from('settings').upsert(
    { unit_id: unitId, key, value, is_public: true, updated_at: new Date().toISOString() },
    { onConflict: 'unit_id,key' },
  );
  return error ? { ok: false, message: 'Falha ao salvar.' } : { ok: true };
}

export async function setBarOpen(open: boolean): Promise<Result & { open: boolean }> {
  const { unitId } = await requireRole('bar');
  await upsertSetting(unitId, 'bar_open', open);
  revalidatePath('/[unit]', 'page');
  return { ok: true, open };
}

/** Libera "Divirta-se" manualmente até o fim do dia (feriados). */
export async function liberateDivirtaToday(): Promise<Result & { date: string }> {
  const { unitId } = await requireRole('bar');
  const { date } = barNow();
  await upsertSetting(unitId, 'divirta_manual_date', date);
  revalidatePath('/[unit]', 'page');
  return { ok: true, date };
}

export async function clearDivirtaLiberation(): Promise<Result> {
  const { unitId } = await requireRole('bar');
  await upsertSetting(unitId, 'divirta_manual_date', null);
  revalidatePath('/[unit]', 'page');
  return { ok: true };
}

/** Define o sabor da proteína do dia (fica visível pro aluno até o fim do dia). */
export async function setProteinOfDay(
  flavor: string,
): Promise<Result & { date?: string; flavor?: string }> {
  const { unitId } = await requireRole('bar');
  const clean = flavor.trim().slice(0, 60);
  if (!clean) return { ok: false, message: 'Escreva o sabor da proteína do dia.' };

  const { date } = barNow();
  const res = await upsertSetting(unitId, 'protein_of_day', { flavor: clean, date });
  revalidatePath('/[unit]', 'page');
  revalidatePath('/bar');
  return res.ok
    ? { ok: true, date, flavor: clean }
    : { ok: false, message: 'Falha ao salvar a proteína do dia.' };
}

/** Marca que alguém já revisou o cardápio clonado desta unidade. */
export async function markMenuReviewed(): Promise<Result> {
  const { unitId } = await requireRole('admin');
  const res = await upsertSetting(unitId, 'menu_review_pending', false);
  revalidatePath('/admin');
  return res;
}
