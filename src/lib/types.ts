// ─────────────────────────────────────────────────────────────
//  Modelos de domínio — SIX Wowness Club
// ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'recebido'
  | 'preparo'
  | 'pronto'
  | 'entregue'
  | 'cancelado';

export type OptionGroupKind = 'single' | 'multiple';

export interface Category {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  note: string | null;
  /** Cor de acento em hex (#RRGGBB) usada nos detalhes da categoria. */
  color: string;
  sort_order: number;
  /** Dias liberados (0=Dom … 6=Sáb). null = disponível todos os dias. */
  available_days: number[] | null;
  is_signature: boolean;
  created_at: string;
}

export interface OptionRow {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
}

export interface OptionGroup {
  id: string;
  menu_item_id: string;
  name: string;
  kind: OptionGroupKind;
  required: boolean;
  sort_order: number;
  options: OptionRow[];
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_available: boolean;
  is_alcoholic: boolean;
  is_signature: boolean;
  /** Nº de estrelas do selo (ex.: SIX Vila Nova = 6). null = sem selo. */
  stars: number | null;
  sort_order: number;
  created_at: string;
  option_groups: OptionGroup[];
}

export interface CategoryWithItems extends Category {
  items: MenuItem[];
  /** Calculado no servidor: a categoria está liberada para pedidos hoje? */
  available_today: boolean;
}

/** Snapshot de uma opção escolhida, gravado no pedido (jsonb). */
export interface SelectedOption {
  group: string;
  option: string;
  price_delta: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  unit_price: number | null;
  selected_options: SelectedOption[];
  created_at: string;
}

export interface Order {
  id: string;
  short_code: string;
  customer_name: string;
  location: string;
  notes: string | null;
  status: OrderStatus;
  cancel_reason: string | null;
  total: number | null;
  /** Quando o bar confirmou que viu o pedido — enquanto for null, o alarme continua tocando. */
  seen_at: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

// ── Configurações públicas (tabela settings, is_public = true) ──
export interface PublicSettings {
  bar_open: boolean;
  locations: string[];
  alert_minutes: number;
  /** Data (YYYY-MM-DD) em que a categoria "Divirta-se" foi liberada manualmente. */
  divirta_manual_date: string | null;
}

// ── Tipos do carrinho (estado do cliente) ──
export interface CartOptionSelection {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price_delta: number;
}

export interface CartLine {
  /** Identificador único da linha do carrinho (mesmo item pode repetir com opções diferentes). */
  lineId: string;
  itemId: string;
  name: string;
  price: number | null;
  quantity: number;
  is_alcoholic: boolean;
  options: CartOptionSelection[];
}
