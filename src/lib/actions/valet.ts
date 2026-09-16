'use server';

import { getValetClient, VALET_BUCKET } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/session';
import { getTakenSlots, getTicketPhotos, getUnitTicket } from '@/lib/valet/queries';
import {
  PHOTO_RETENTION_DAYS,
  REQUIRED_SLOTS,
  TICKET_COLUMNS,
  normalizeCode,
  normalizePlate,
  type PhotoPhase,
  type PhotoSlot,
  type ValetPhoto,
  type ValetStatus,
  type ValetTicket,
} from '@/lib/valet/constants';

// Ações do MOTORISTA (painel /valet). Todas exigem canViewValet e só
// mexem em ticket da unidade da sessão — service_role ignora RLS, então a
// trava de unidade é feita aqui, em toda query.

type Fail = { ok: false; message: string };
type TicketResult = { ok: true; ticket: ValetTicket } | Fail;

const SLOTS: PhotoSlot[] = ['frente', 'traseira', 'lateral_esq', 'lateral_dir', 'extra'];
const PHASES: PhotoPhase[] = ['checkin', 'checkout'];

function missingMessage(missing: number, phase: PhotoPhase) {
  const when = phase === 'checkin' ? 'de chegada' : 'de devolução';
  return `Faltam ${missing} ${missing === 1 ? 'foto' : 'fotos'} ${when} (frente, traseira e as duas laterais).`;
}

/** Atualiza status só se o ticket estiver num dos status esperados. */
async function transition(
  unitId: string,
  ticketId: string,
  from: ValetStatus[],
  patch: Record<string, unknown>,
  failMessage: string,
): Promise<TicketResult> {
  const { data, error } = await getValetClient()
    .from('tickets')
    .update(patch)
    .eq('id', ticketId)
    .eq('unit_id', unitId)
    .in('status', from)
    .select(TICKET_COLUMNS)
    .maybeSingle();
  if (error) return { ok: false, message: 'Falha ao atualizar o ticket.' };
  if (!data) return { ok: false, message: failMessage };
  return { ok: true, ticket: data as ValetTicket };
}

/** Motorista abre ticket pro aluno que não leu o QR. */
export async function createDriverTicket(input: {
  name: string;
  phone: string;
  plate: string;
}): Promise<TicketResult> {
  const { unitId } = await requireRole('valet');
  const name = input.name?.trim().slice(0, 60);
  const plate = normalizePlate(input.plate ?? '');
  const phone = input.phone?.replace(/[^\d+() -]/g, '').trim().slice(0, 20) || null;
  if (!name) return { ok: false, message: 'Informe o nome do aluno.' };
  if (plate.length < 7) return { ok: false, message: 'Informe a placa completa.' };

  const sb = getValetClient();
  const { data: existing } = await sb
    .from('tickets')
    .select('code')
    .eq('unit_id', unitId)
    .eq('plate', plate)
    .not('status', 'in', '(entregue,cancelado)')
    .maybeSingle();
  if (existing) return { ok: false, message: `Essa placa já está no valet (ticket #${existing.code}).` };

  const { data, error } = await sb
    .rpc('create_ticket', {
      p_unit_id: unitId,
      p_customer_name: name,
      p_customer_phone: phone,
      p_plate: plate,
      p_created_by: 'motorista',
    })
    .single<{ id: string }>();
  if (error || !data) return { ok: false, message: 'Não foi possível abrir o ticket.' };

  const ticket = await getUnitTicket(unitId, data.id);
  return ticket ? { ok: true, ticket } : { ok: false, message: 'Ticket criado, recarregue a tela.' };
}

/** Modelo, cor, vaga, observação. */
export async function updateCarInfo(
  ticketId: string,
  info: { car_model?: string; car_color?: string; parking_spot?: string; notes?: string },
): Promise<TicketResult> {
  const { unitId } = await requireRole('valet');
  const clean = (v?: string, max = 60) => (v === undefined ? undefined : v.trim().slice(0, max) || null);
  const patch = {
    car_model: clean(info.car_model),
    car_color: clean(info.car_color, 30),
    parking_spot: clean(info.parking_spot, 30),
    notes: clean(info.notes, 300),
  };
  const { data, error } = await getValetClient()
    .from('tickets')
    .update(Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)))
    .eq('id', ticketId)
    .eq('unit_id', unitId)
    .select(TICKET_COLUMNS)
    .maybeSingle();
  if (error || !data) return { ok: false, message: 'Não foi possível salvar os dados do carro.' };
  return { ok: true, ticket: data as ValetTicket };
}

/** URL assinada pra o celular do motorista enviar UMA foto direto pro storage. */
export async function getPhotoUploadUrl(
  ticketId: string,
  phase: PhotoPhase,
  slot: PhotoSlot,
): Promise<{ ok: true; path: string; token: string } | Fail> {
  const { unitId } = await requireRole('valet');
  if (!PHASES.includes(phase) || !SLOTS.includes(slot)) return { ok: false, message: 'Foto inválida.' };
  const ticket = await getUnitTicket(unitId, ticketId);
  if (!ticket) return { ok: false, message: 'Ticket não encontrado.' };

  const path = `${unitId}/${ticketId}/${phase}-${slot}-${Date.now()}.jpg`;
  const { data, error } = await getValetClient().storage.from(VALET_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: 'Não foi possível preparar o envio da foto.' };
  return { ok: true, path: data.path, token: data.token };
}

/** Registra a foto já enviada. Foto obrigatória substitui a anterior do mesmo lado. */
export async function registerPhoto(
  ticketId: string,
  phase: PhotoPhase,
  slot: PhotoSlot,
  path: string,
): Promise<{ ok: true; photo: ValetPhoto } | Fail> {
  const session = await requireRole('valet');
  const { unitId } = session;
  if (!PHASES.includes(phase) || !SLOTS.includes(slot)) return { ok: false, message: 'Foto inválida.' };
  if (!path.startsWith(`${unitId}/${ticketId}/${phase}-${slot}-`))
    return { ok: false, message: 'Foto não pertence a este ticket.' };
  if (!(await getUnitTicket(unitId, ticketId))) return { ok: false, message: 'Ticket não encontrado.' };

  const sb = getValetClient();

  if (slot !== 'extra') {
    const { data: old } = await sb
      .from('photos')
      .select('id, storage_path')
      .eq('ticket_id', ticketId)
      .eq('phase', phase)
      .eq('slot', slot)
      .is('deleted_at', null);
    if (old?.length) {
      await sb.storage.from(VALET_BUCKET).remove(old.map((o) => o.storage_path));
      await sb.from('photos').delete().in('id', old.map((o) => o.id));
    }
  }

  const { data, error } = await sb
    .from('photos')
    .insert({ ticket_id: ticketId, phase, slot, storage_path: path, taken_by: session.userId })
    .select('id, ticket_id, phase, slot, created_at')
    .single();
  if (error || !data) return { ok: false, message: 'Foto enviada, mas não registrada. Tire de novo.' };

  const { data: signed } = await sb.storage.from(VALET_BUCKET).createSignedUrl(path, 3600);
  return { ok: true, photo: { ...(data as Omit<ValetPhoto, 'url'>), url: signed?.signedUrl ?? null } };
}

export async function listTicketPhotos(ticketId: string): Promise<{ ok: true; photos: ValetPhoto[] } | Fail> {
  const { unitId } = await requireRole('valet');
  if (!(await getUnitTicket(unitId, ticketId))) return { ok: false, message: 'Ticket não encontrado.' };
  return { ok: true, photos: await getTicketPhotos(ticketId) };
}

/** Chegada: com as 4 fotos, o carro passa a "estacionado". */
export async function confirmCheckin(
  ticketId: string,
  info: { car_model: string; car_color: string; parking_spot: string },
): Promise<TicketResult> {
  const session = await requireRole('valet');
  const taken = await getTakenSlots(ticketId, 'checkin');
  const missing = REQUIRED_SLOTS.filter((s) => !taken.has(s)).length;
  if (missing > 0) return { ok: false, message: missingMessage(missing, 'checkin') };

  return transition(
    session.unitId,
    ticketId,
    ['aguardando'],
    {
      status: 'estacionado',
      car_model: info.car_model?.trim().slice(0, 60) || null,
      car_color: info.car_color?.trim().slice(0, 30) || null,
      parking_spot: info.parking_spot?.trim().slice(0, 30) || null,
      checked_in_at: new Date().toISOString(),
      checkin_by: session.userId,
    },
    'Este carro já foi recebido.',
  );
}

/** Motorista saiu pra buscar o carro. Aceita também sem pedido do aluno (ex.: aluno pediu no balcão). */
export async function startFetch(ticketId: string): Promise<TicketResult> {
  const { unitId } = await requireRole('valet');
  const now = new Date().toISOString();
  const ticket = await getUnitTicket(unitId, ticketId);
  return transition(
    unitId,
    ticketId,
    ['estacionado', 'solicitado'],
    { status: 'buscando', requested_at: ticket?.requested_at ?? now },
    'Este carro não está aguardando retirada.',
  );
}

/** Volta um passo (toque acidental). */
export async function revertTicket(ticketId: string): Promise<TicketResult> {
  const { unitId } = await requireRole('valet');
  const ticket = await getUnitTicket(unitId, ticketId);
  if (!ticket) return { ok: false, message: 'Ticket não encontrado.' };
  const back: Partial<Record<ValetStatus, Record<string, unknown>>> = {
    buscando: { status: 'solicitado' },
    pronto: { status: 'buscando', ready_at: null, checkout_by: null },
  };
  const patch = back[ticket.status];
  if (!patch) return { ok: false, message: 'Não dá pra voltar deste status.' };
  return transition(unitId, ticketId, [ticket.status], patch, 'O ticket mudou, recarregue.');
}

/** Devolução: com as 4 fotos, o carro fica "pronto na saída". */
export async function markReady(ticketId: string): Promise<TicketResult> {
  const session = await requireRole('valet');
  const taken = await getTakenSlots(ticketId, 'checkout');
  const missing = REQUIRED_SLOTS.filter((s) => !taken.has(s)).length;
  if (missing > 0) return { ok: false, message: missingMessage(missing, 'checkout') };
  return transition(
    session.unitId,
    ticketId,
    ['solicitado', 'buscando'],
    { status: 'pronto', ready_at: new Date().toISOString(), checkout_by: session.userId },
    'Este carro não está sendo buscado.',
  );
}

/** Entrega a chave — só com o código do aluno conferido. */
export async function deliverCar(ticketId: string, code: string): Promise<TicketResult> {
  const session = await requireRole('valet');
  const ticket = await getUnitTicket(session.unitId, ticketId);
  if (!ticket) return { ok: false, message: 'Ticket não encontrado.' };
  if (normalizeCode(code) !== ticket.code)
    return { ok: false, message: 'Código não confere. Peça pro aluno mostrar o código no celular.' };
  return transition(
    session.unitId,
    ticketId,
    ['pronto'],
    { status: 'entregue', delivered_at: new Date().toISOString(), delivered_by: session.userId },
    'O carro ainda não está na saída.',
  );
}

export async function cancelTicket(ticketId: string, reason: string): Promise<TicketResult> {
  const { unitId } = await requireRole('valet');
  return transition(
    unitId,
    ticketId,
    ['aguardando', 'estacionado', 'solicitado', 'buscando', 'pronto'],
    { status: 'cancelado', cancel_reason: reason.trim().slice(0, 200) || 'Cancelado pelo valet.' },
    'Este ticket já foi finalizado.',
  );
}

/** Liga/desliga o valet da unidade (Master/Gestor). */
export async function setValetEnabled(enabled: boolean): Promise<{ ok: true; enabled: boolean } | Fail> {
  const session = await requireRole('valet');
  if (!session.permissions.canManageValet)
    return { ok: false, message: 'Só o gestor da unidade pode ligar ou desligar o valet.' };
  const { error } = await getValetClient()
    .from('settings')
    .upsert(
      { unit_id: session.unitId, key: 'valet_enabled', value: enabled, updated_at: new Date().toISOString() },
      { onConflict: 'unit_id,key' },
    );
  if (error) return { ok: false, message: 'Não foi possível salvar.' };
  return { ok: true, enabled };
}

/** Histórico dos últimos 30 dias (mesma janela das fotos), com busca por placa/código/nome. */
export async function searchHistory(query: string): Promise<{ ok: true; tickets: ValetTicket[] } | Fail> {
  const { unitId } = await requireRole('valet');
  const since = new Date(Date.now() - PHOTO_RETENTION_DAYS * 86400000).toISOString();
  let q = getValetClient()
    .from('tickets')
    .select(TICKET_COLUMNS)
    .eq('unit_id', unitId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);

  const term = query.trim();
  if (term) {
    const plate = normalizePlate(term);
    const safe = term.replace(/[%,()]/g, ' ').slice(0, 40);
    const filters = [`customer_name.ilike.%${safe}%`];
    if (plate) filters.push(`plate.ilike.%${plate}%`);
    if (plate.length <= 4 && plate) filters.push(`code.eq.${normalizeCode(plate)}`);
    q = q.or(filters.join(','));
  }

  const { data, error } = await q;
  if (error) return { ok: false, message: 'Não foi possível buscar o histórico.' };
  return { ok: true, tickets: (data ?? []) as ValetTicket[] };
}
