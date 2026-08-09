'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicSettings, getAdminMenu } from '@/lib/queries';
import { isCategoryAvailableToday } from '@/lib/availability';
import type { SelectedOption } from '@/lib/types';

export interface SubmitOrderItemInput {
  itemId: string;
  quantity: number;
  optionIds: string[];
}

export interface SubmitOrderInput {
  customerName: string;
  location: string;
  notes?: string;
  items: SubmitOrderItemInput[];
}

export type SubmitOrderResult =
  | { ok: true; orderId: string; shortCode: string }
  | { ok: false; error: string; message: string };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateShortCode(): string {
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Registra um novo pedido.
 * O servidor RECONSTRÓI o pedido a partir dos IDs (nunca confia em preço/nome
 * vindos do cliente) e revalida todas as regras de negócio antes de gravar.
 */
export async function submitOrder(
  input: SubmitOrderInput,
): Promise<SubmitOrderResult> {
  const name = input.customerName?.trim();
  const location = input.location?.trim();

  if (!name) return { ok: false, error: 'name', message: 'Informe seu nome.' };
  if (!location)
    return { ok: false, error: 'location', message: 'Selecione onde você está.' };
  if (!input.items?.length)
    return { ok: false, error: 'empty', message: 'Seu carrinho está vazio.' };

  const settings = await getPublicSettings();
  if (!settings.bar_open)
    return {
      ok: false,
      error: 'bar_closed',
      message: 'O bar está fechado no momento.',
    };
  if (!settings.locations.includes(location))
    return { ok: false, error: 'location', message: 'Local inválido.' };

  const { menu } = await getAdminMenu();

  // Lookups: item por id, opção por id (com grupo e item de origem).
  const itemMap = new Map<
    string,
    { item: (typeof menu)[number]['items'][number]; category: (typeof menu)[number] }
  >();
  const optionMap = new Map<
    string,
    {
      name: string;
      price_delta: number;
      groupId: string;
      groupName: string;
      itemId: string;
    }
  >();

  for (const cat of menu) {
    for (const item of cat.items) {
      itemMap.set(item.id, { item, category: cat });
      for (const g of item.option_groups) {
        for (const o of g.options) {
          optionMap.set(o.id, {
            name: o.name,
            price_delta: Number(o.price_delta),
            groupId: g.id,
            groupName: g.name,
            itemId: item.id,
          });
        }
      }
    }
  }

  const orderItemsPayload: {
    item_name: string;
    quantity: number;
    unit_price: number | null;
    selected_options: SelectedOption[];
  }[] = [];

  let allPriced = true;
  let total = 0;

  for (const line of input.items) {
    const entry = itemMap.get(line.itemId);
    if (!entry)
      return {
        ok: false,
        error: 'item',
        message: 'Um item do pedido não existe mais.',
      };

    const { item, category } = entry;

    if (!item.is_available)
      return {
        ok: false,
        error: 'unavailable',
        message: `"${item.name}" está indisponível agora.`,
      };
    if (!isCategoryAvailableToday(category, settings))
      return {
        ok: false,
        error: 'category',
        message: `"${category.name}" não está disponível hoje.`,
      };

    const qty = Math.min(30, Math.max(1, Math.floor(line.quantity || 1)));

    const selected: SelectedOption[] = [];
    const chosenByGroup = new Map<string, number>();
    let optionDelta = 0;

    for (const oid of line.optionIds ?? []) {
      const om = optionMap.get(oid);
      if (!om || om.itemId !== item.id)
        return { ok: false, error: 'option', message: 'Opção inválida no pedido.' };
      selected.push({
        group: om.groupName,
        option: om.name,
        price_delta: om.price_delta,
      });
      optionDelta += om.price_delta;
      chosenByGroup.set(om.groupId, (chosenByGroup.get(om.groupId) ?? 0) + 1);
    }

    for (const g of item.option_groups) {
      const c = chosenByGroup.get(g.id) ?? 0;
      if (g.kind === 'single') {
        if (g.required && c !== 1)
          return {
            ok: false,
            error: 'option',
            message: `Escolha uma opção de "${g.name}" em ${item.name}.`,
          };
        if (!g.required && c > 1)
          return {
            ok: false,
            error: 'option',
            message: `Escolha no máximo uma opção de "${g.name}".`,
          };
      } else if (g.required && c < 1) {
        return {
          ok: false,
          error: 'option',
          message: `Escolha ao menos uma opção de "${g.name}".`,
        };
      }
    }

    const unitPrice = item.price === null ? null : Number(item.price) + optionDelta;
    if (unitPrice === null) allPriced = false;
    else total += unitPrice * qty;

    orderItemsPayload.push({
      item_name: item.name,
      quantity: qty,
      unit_price: unitPrice,
      selected_options: selected,
    });
  }

  const sb = getAdminClient();
  const { data: order, error: orderErr } = await sb
    .from('orders')
    .insert({
      short_code: generateShortCode(),
      customer_name: name.slice(0, 60),
      location,
      notes: input.notes?.trim()?.slice(0, 300) || null,
      status: 'recebido',
      total: allPriced ? Number(total.toFixed(2)) : null,
    })
    .select('id, short_code')
    .single();

  if (orderErr || !order) {
    return {
      ok: false,
      error: 'db',
      message: 'Não foi possível registrar o pedido. Tente novamente.',
    };
  }

  const { error: itemsErr } = await sb.from('order_items').insert(
    orderItemsPayload.map((oi) => ({ ...oi, order_id: order.id })),
  );

  if (itemsErr) {
    await sb.from('orders').delete().eq('id', order.id);
    return {
      ok: false,
      error: 'db',
      message: 'Falha ao registrar os itens. Tente novamente.',
    };
  }

  return { ok: true, orderId: order.id, shortCode: order.short_code };
}
