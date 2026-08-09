import type { OrderStatus } from './types';

/** Fluxo de avanço do pedido no painel do bar. */
export const STATUS_FLOW: OrderStatus[] = [
  'recebido',
  'preparo',
  'pronto',
  'entregue',
];

export const STATUS_META: Record<
  OrderStatus,
  { label: string; short: string; hint: string }
> = {
  recebido: {
    label: 'Recebido',
    short: 'Recebido',
    hint: 'Seu pedido chegou ao bar.',
  },
  preparo: {
    label: 'Em preparo',
    short: 'Preparando',
    hint: 'O bartender está montando seu pedido.',
  },
  pronto: {
    label: 'Pronto',
    short: 'Pronto',
    hint: 'Pode retirar no balcão — ou aguarde a entrega.',
  },
  entregue: {
    label: 'Entregue',
    short: 'Entregue',
    hint: 'Pedido concluído. Bom treino!',
  },
  cancelado: {
    label: 'Cancelado',
    short: 'Cancelado',
    hint: 'Este pedido foi cancelado.',
  },
};

/** Rótulo do botão que leva ao próximo status. */
export const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  recebido: 'Iniciar preparo',
  preparo: 'Marcar pronto',
  pronto: 'Marcar entregue',
};

export function nextStatus(current: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(current);
  if (i === -1 || i >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1];
}

/** Slugs especiais referenciados pela regra de negócio. */
export const DIVIRTA_SLUG = 'divirta-se';
export const SIGNATURE_SLUG = 'drinks-six-health';

/** Nota obrigatória para itens alcoólicos. */
export const ALCOHOL_NOTE =
  'Venda e consumo permitidos apenas para maiores de 18 anos.';

/** Locais padrão da academia (editáveis no admin). */
export const DEFAULT_LOCATIONS = [
  'Musculação',
  'Cardio',
  'Área de Lutas',
  'Studio',
  'Recepção',
  'Banheiro feminino',
  'Banheiro masculino',
  'Rooftop',
];

export const DEFAULT_ALERT_MINUTES = 8;

export const WEEKDAYS_PT = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];
export const WEEKDAYS_SHORT_PT = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
];

/** Fuso do bar — usado para "hoje", dias liberados e histórico do dia. */
export const BAR_TIMEZONE = 'America/Sao_Paulo';
