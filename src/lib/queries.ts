import 'server-only';
import { getAdminClient } from './supabase/admin';
import { isCategoryAvailableToday } from './availability';
import { barDayStartISO } from './datetime';
import {
  DEFAULT_ALERT_MINUTES,
  DEFAULT_LOCATIONS,
} from './constants';
import type {
  Category,
  CategoryWithItems,
  MenuItem,
  OptionGroup,
  OptionRow,
  Order,
  OrderItem,
  ProteinOfDay,
  PublicSettings,
  SelectedOption,
} from './types';

// ─────────────────────────── Settings ──────────────────────────────

export async function getPublicSettings(): Promise<PublicSettings> {
  const sb = getAdminClient();
  const { data } = await sb
    .from('settings')
    .select('key, value')
    .in('key', [
      'bar_open',
      'locations',
      'alert_minutes',
      'divirta_manual_date',
      'protein_of_day',
    ]);

  const map = new Map<string, unknown>((data ?? []).map((r) => [r.key, r.value]));

  return {
    bar_open: (map.get('bar_open') ?? true) as boolean,
    locations: (map.get('locations') as string[] | null) ?? DEFAULT_LOCATIONS,
    alert_minutes: (map.get('alert_minutes') as number | null) ?? DEFAULT_ALERT_MINUTES,
    divirta_manual_date: (map.get('divirta_manual_date') as string | null) ?? null,
    protein_of_day: (map.get('protein_of_day') as ProteinOfDay | null) ?? null,
  };
}

/** Lê uma chave crua de settings (inclui as secretas, ex.: hash de PIN). */
export async function getSettingValue<T = unknown>(
  key: string,
): Promise<T | null> {
  const sb = getAdminClient();
  const { data } = await sb
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return (data?.value ?? null) as T | null;
}

// ─────────────────────────── Cardápio ──────────────────────────────

function assembleMenu(
  categories: Category[],
  items: MenuItem[],
  groups: OptionGroup[],
  options: OptionRow[],
  settings: Pick<PublicSettings, 'divirta_manual_date'>,
  includeUnavailable: boolean,
  now: Date = new Date(),
): CategoryWithItems[] {
  const optionsByGroup = new Map<string, OptionRow[]>();
  for (const o of options) {
    const list = optionsByGroup.get(o.group_id) ?? [];
    list.push(o);
    optionsByGroup.set(o.group_id, list);
  }

  const groupsByItem = new Map<string, OptionGroup[]>();
  for (const g of groups) {
    const withOptions: OptionGroup = {
      ...g,
      options: (optionsByGroup.get(g.id) ?? []).sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    };
    const list = groupsByItem.get(g.menu_item_id) ?? [];
    list.push(withOptions);
    groupsByItem.set(g.menu_item_id, list);
  }

  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const it of items) {
    if (!includeUnavailable && !it.is_available) continue;
    const full: MenuItem = {
      ...it,
      option_groups: (groupsByItem.get(it.id) ?? []).sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    };
    const list = itemsByCategory.get(it.category_id) ?? [];
    list.push(full);
    itemsByCategory.set(it.category_id, list);
  }

  return categories
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      ...c,
      items: (itemsByCategory.get(c.id) ?? []).sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
      available_today: isCategoryAvailableToday(c, settings, now),
    }));
}

async function fetchMenuTables() {
  const sb = getAdminClient();
  const [cats, items, groups, options] = await Promise.all([
    sb.from('categories').select('*'),
    sb.from('menu_items').select('*'),
    sb.from('option_groups').select('*'),
    sb.from('options').select('*'),
  ]);
  return {
    categories: (cats.data ?? []) as Category[],
    items: (items.data ?? []) as MenuItem[],
    groups: (groups.data ?? []).map((g) => ({ ...g, options: [] })) as OptionGroup[],
    options: (options.data ?? []) as OptionRow[],
  };
}

/** Cardápio do aluno: apenas itens disponíveis, com flag de dia por categoria. */
export async function getStudentMenu(): Promise<{
  menu: CategoryWithItems[];
  settings: PublicSettings;
}> {
  const [{ categories, items, groups, options }, settings] = await Promise.all([
    fetchMenuTables(),
    getPublicSettings(),
  ]);
  const menu = assembleMenu(categories, items, groups, options, settings, false);
  return { menu, settings };
}

/** Cardápio completo para o admin: inclui itens indisponíveis. */
export async function getAdminMenu(): Promise<{
  menu: CategoryWithItems[];
  settings: PublicSettings;
}> {
  const [{ categories, items, groups, options }, settings] = await Promise.all([
    fetchMenuTables(),
    getPublicSettings(),
  ]);
  const menu = assembleMenu(categories, items, groups, options, settings, true);
  return { menu, settings };
}

// ──────────────────────────── Pedidos ──────────────────────────────

function sortItems(order: Order): Order {
  if (order.order_items) {
    order.order_items = [...order.order_items].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }
  return order;
}

export async function getOrder(id: string): Promise<Order | null> {
  const sb = getAdminClient();
  const { data } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return sortItems(data as Order);
}

/** Fila ativa do bar: recebido/preparo/pronto, por ordem de chegada. */
export async function getActiveOrders(): Promise<Order[]> {
  const sb = getAdminClient();
  const { data } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .in('status', ['recebido', 'preparo', 'pronto'])
    .order('created_at', { ascending: true });
  return ((data ?? []) as Order[]).map(sortItems);
}

/** Histórico do dia: entregue/cancelado criados hoje (fuso do bar). */
export async function getTodayHistory(): Promise<Order[]> {
  const sb = getAdminClient();
  const { data } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .in('status', ['entregue', 'cancelado'])
    .gte('created_at', barDayStartISO())
    .order('created_at', { ascending: false });
  return ((data ?? []) as Order[]).map(sortItems);
}

export interface DayStats {
  total: number;
  delivered: number;
  cancelled: number;
  topItems: { name: string; count: number }[];
}

/** Contadores simples do dia para o painel do bar. */
export async function getDayStats(): Promise<DayStats> {
  const sb = getAdminClient();
  const { data: orders } = await sb
    .from('orders')
    .select('id, status')
    .gte('created_at', barDayStartISO());

  const rows = (orders ?? []) as { id: string; status: string }[];
  const total = rows.length;
  const delivered = rows.filter((o) => o.status === 'entregue').length;
  const cancelled = rows.filter((o) => o.status === 'cancelado').length;

  // Itens com mais saída (exclui pedidos cancelados)
  const validIds = rows.filter((o) => o.status !== 'cancelado').map((o) => o.id);
  const counts = new Map<string, number>();
  if (validIds.length > 0) {
    const { data: items } = await sb
      .from('order_items')
      .select('item_name, quantity, order_id')
      .in('order_id', validIds);
    for (const it of (items ?? []) as OrderItem[]) {
      counts.set(it.item_name, (counts.get(it.item_name) ?? 0) + it.quantity);
    }
  }
  const topItems = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { total, delivered, cancelled, topItems };
}

export interface ItemStat {
  name: string;
  count: number;
  orders: number;
}

export interface VariantStat {
  itemName: string;
  variantLabel: string | null;
  count: number;
}

export interface OverallStats {
  totalOrders: number;
  totalItemsSold: number;
  byItem: ItemStat[];
  byVariant: VariantStat[];
}

/** Rótulo estável da combinação de opções escolhidas (ex.: "Caramelo · Água"). */
function variantLabel(options: SelectedOption[]): string | null {
  if (!options.length) return null;
  return [...options]
    .sort((a, b) => a.group.localeCompare(b.group) || a.option.localeCompare(b.option))
    .map((o) => o.option)
    .join(' · ');
}

/**
 * Estatísticas de todos os tempos (exclui cancelados): ranking por bebida
 * e ranking por variante (bebida + opções), para analisar produtos
 * individualmente (ex.: "Ultracoffee — Caramelo · Água").
 */
export async function getOverallItemStats(): Promise<OverallStats> {
  const sb = getAdminClient();
  const { data: orders } = await sb.from('orders').select('id, status').neq('status', 'cancelado');
  const validIds = ((orders ?? []) as { id: string; status: string }[]).map((o) => o.id);

  const byItemCount = new Map<string, number>();
  const byItemOrders = new Map<string, Set<string>>();
  const byVariantCount = new Map<string, { itemName: string; variantLabel: string | null; count: number }>();
  let totalItemsSold = 0;

  if (validIds.length > 0) {
    const { data: items } = await sb
      .from('order_items')
      .select('order_id, item_name, quantity, selected_options')
      .in('order_id', validIds);

    for (const it of (items ?? []) as OrderItem[]) {
      totalItemsSold += it.quantity;

      byItemCount.set(it.item_name, (byItemCount.get(it.item_name) ?? 0) + it.quantity);
      const orderSet = byItemOrders.get(it.item_name) ?? new Set<string>();
      orderSet.add(it.order_id);
      byItemOrders.set(it.item_name, orderSet);

      const label = variantLabel(it.selected_options);
      const key = `${it.item_name}::${label ?? ''}`;
      const existing = byVariantCount.get(key);
      if (existing) existing.count += it.quantity;
      else byVariantCount.set(key, { itemName: it.item_name, variantLabel: label, count: it.quantity });
    }
  }

  const byItem = [...byItemCount.entries()]
    .map(([name, count]) => ({ name, count, orders: byItemOrders.get(name)?.size ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const byVariant = [...byVariantCount.values()].sort((a, b) => b.count - a.count);

  return { totalOrders: validIds.length, totalItemsSold, byItem, byVariant };
}
