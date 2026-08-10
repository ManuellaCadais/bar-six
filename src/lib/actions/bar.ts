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
  await requireRole('bar');
  const sb = getAdminClient();
  const { data: cur } = await sb
    .from('orders')
    .select('status, seen_at')
    .eq('id', orderId)
    .maybeSingle();
  if (!cur) return { ok: false, message: 'Pedido não encontrado.' };

  const nxt = nextStatus(cur.status as OrderStatus);
  if (!nxt) return { ok: false, message: 'Pedido já finalizado.' };

  // Avançar o status é, por si só, uma confirmação de que o bar viu o pedido
  // — evita o alarme continuar tocando se o toque foi direto no botão de status.
  const { error } = await sb
    .from('orders')
    .update({ status: nxt, seen_at: cur.seen_at ?? new Date().toISOString() })
    .eq('id', orderId);
  if (error) return { ok: false, message: 'Falha ao atualizar o status.' };
  return { ok: true, status: nxt };
}

/** Confirma que o bar viu o pedido — silencia o alarme sonoro para ele. */
export async function markOrderSeen(orderId: string): Promise<Result> {
  await requireRole('bar');
  const sb = getAdminClient();
  const { error } = await sb
    .from('orders')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', orderId)
    .is('seen_at', null);
  return error ? { ok: false, message: 'Falha ao confirmar.' } : { ok: true };
}

/** Volta o pedido um passo (correção de toque acidental). */
export async function revertOrderStatus(
  orderId: string,
): Promise<Result & { status?: OrderStatus }> {
  await requireRole('bar');
  const flow: OrderStatus[] = ['recebido', 'preparo', 'pronto', 'entregue'];
  const sb = getAdminClient();
  const { data: cur } = await sb
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle();
  if (!cur) return { ok: false, message: 'Pedido não encontrado.' };
  const i = flow.indexOf(cur.status as OrderStatus);
  if (i <= 0) return { ok: false, message: 'Não é possível voltar.' };
  const prev = flow[i - 1];
  const { error } = await sb.from('orders').update({ status: prev }).eq('id', orderId);
  if (error) return { ok: false, message: 'Falha ao reverter.' };
  return { ok: true, status: prev };
}

export async function cancelOrder(orderId: string, reason: string): Promise<Result> {
  await requireRole('bar');
  const sb = getAdminClient();
  const clean = (reason ?? '').trim().slice(0, 200) || 'Cancelado pelo bar.';
  // Só cancela pedidos ativos — nunca sobrescreve um já entregue/cancelado.
  const { data, error } = await sb
    .from('orders')
    .update({ status: 'cancelado', cancel_reason: clean })
    .eq('id', orderId)
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
  await requireRole('bar');
  const sb = getAdminClient();
  const { error } = await sb
    .from('menu_items')
    .update({ is_available: available })
    .eq('id', itemId);
  revalidatePath('/');
  return error ? { ok: false, message: 'Falha ao atualizar item.' } : { ok: true };
}

export async function setBarOpen(open: boolean): Promise<Result & { open: boolean }> {
  await requireRole('bar');
  const sb = getAdminClient();
  await sb.from('settings').upsert(
    { key: 'bar_open', value: open, is_public: true, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  revalidatePath('/');
  return { ok: true, open };
}

/** Libera "Divirta-se" manualmente até o fim do dia (feriados). */
export async function liberateDivirtaToday(): Promise<Result & { date: string }> {
  await requireRole('bar');
  const sb = getAdminClient();
  const { date } = barNow();
  await sb.from('settings').upsert(
    { key: 'divirta_manual_date', value: date, is_public: true, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  revalidatePath('/');
  return { ok: true, date };
}

export async function clearDivirtaLiberation(): Promise<Result> {
  await requireRole('bar');
  const sb = getAdminClient();
  await sb.from('settings').upsert(
    { key: 'divirta_manual_date', value: null, is_public: true, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  revalidatePath('/');
  return { ok: true };
}
