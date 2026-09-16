// Tipos e constantes do valet — sem 'server-only': usados no cliente e no servidor.

export type ValetStatus =
  | 'aguardando'
  | 'estacionado'
  | 'solicitado'
  | 'buscando'
  | 'pronto'
  | 'entregue'
  | 'cancelado';

export type PhotoPhase = 'checkin' | 'checkout';
export type PhotoSlot = 'frente' | 'traseira' | 'lateral_esq' | 'lateral_dir' | 'extra';

export interface ValetTicket {
  id: string;
  unit_id: string;
  code: string;
  customer_name: string;
  customer_phone: string | null;
  plate: string;
  car_model: string | null;
  car_color: string | null;
  parking_spot: string | null;
  notes: string | null;
  status: ValetStatus;
  created_by: 'aluno' | 'motorista';
  cancel_reason: string | null;
  created_at: string;
  checked_in_at: string | null;
  requested_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  updated_at: string;
}

export interface ValetPhoto {
  id: string;
  ticket_id: string;
  phase: PhotoPhase;
  slot: PhotoSlot;
  created_at: string;
  /** URL assinada temporária (null se o arquivo já foi apagado pela retenção). */
  url: string | null;
}

/** O que o aluno enxerga do próprio ticket (sem telefone nem dados internos). */
export interface PublicTicketView {
  code: string;
  status: ValetStatus;
  customer_name: string;
  plate: string;
  car_model: string | null;
  car_color: string | null;
  cancel_reason: string | null;
  created_at: string;
  requested_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
}

/** Colunas lidas das tabelas — nunca inclui public_token. */
export const TICKET_COLUMNS =
  'id, unit_id, code, customer_name, customer_phone, plate, car_model, car_color, parking_spot, notes, status, created_by, cancel_reason, created_at, checked_in_at, requested_at, ready_at, delivered_at, updated_at';

export const ACTIVE_STATUSES: ValetStatus[] = [
  'aguardando',
  'estacionado',
  'solicitado',
  'buscando',
  'pronto',
];

/** As 4 fotos obrigatórias, na chegada e na devolução. */
export const REQUIRED_SLOTS: Exclude<PhotoSlot, 'extra'>[] = [
  'frente',
  'traseira',
  'lateral_esq',
  'lateral_dir',
];

export const SLOT_LABEL: Record<PhotoSlot, string> = {
  frente: 'Frente',
  traseira: 'Traseira',
  lateral_esq: 'Lateral esquerda',
  lateral_dir: 'Lateral direita',
  extra: 'Detalhe',
};

export const PHOTO_RETENTION_DAYS = 30;

/** Etapas mostradas ao aluno, na ordem. */
export const STUDENT_FLOW: ValetStatus[] = [
  'aguardando',
  'estacionado',
  'solicitado',
  'buscando',
  'pronto',
  'entregue',
];

export const STATUS_META: Record<ValetStatus, { label: string; hint: string; driver: string }> = {
  aguardando: {
    label: 'Aguardando motorista',
    hint: 'Entregue a chave ao motorista do valet.',
    driver: 'Chegando',
  },
  estacionado: {
    label: 'Carro estacionado',
    hint: 'Seu carro está guardado. Quando quiser ir embora, é só pedir.',
    driver: 'Estacionado',
  },
  solicitado: {
    label: 'Pedido recebido',
    hint: 'O valet recebeu seu pedido e vai buscar o carro.',
    driver: 'Pedido de retirada',
  },
  buscando: {
    label: 'Motorista a caminho',
    hint: 'O motorista está trazendo seu carro.',
    driver: 'Buscando',
  },
  pronto: {
    label: 'Carro na saída',
    hint: 'Seu carro está pronto. Mostre seu código ao motorista.',
    driver: 'Na saída',
  },
  entregue: {
    label: 'Entregue',
    hint: 'Carro entregue. Bom retorno!',
    driver: 'Entregue',
  },
  cancelado: {
    label: 'Cancelado',
    hint: 'Este ticket foi cancelado.',
    driver: 'Cancelado',
  },
};

/** Placa só com letras/números, maiúscula (ABC1D23). */
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

/** Código do ticket sem "#" e espaços, maiúsculo. */
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

/** Placa legível: ABC-1D23. */
export function formatPlate(plate: string): string {
  return plate.length === 7 ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;
}
