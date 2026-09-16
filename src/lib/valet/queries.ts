import 'server-only';
import { getValetClient, VALET_BUCKET } from '@/lib/supabase/admin';
import { barDayStartISO } from '@/lib/datetime';
import {
  ACTIVE_STATUSES,
  TICKET_COLUMNS,
  type PhotoPhase,
  type PhotoSlot,
  type ValetPhoto,
  type ValetTicket,
} from './constants';

// Todas as leituras do valet passam por aqui (service_role, schema `valet`).
// Se o schema ainda não existir/estiver exposto (valet.sql não rodado),
// as funções devolvem "desligado"/vazio em vez de derrubar a página do bar.

export async function isValetEnabled(unitId: string): Promise<boolean> {
  try {
    const { data, error } = await getValetClient()
      .from('settings')
      .select('value')
      .eq('unit_id', unitId)
      .eq('key', 'valet_enabled')
      .maybeSingle();
    if (error) return false;
    return data?.value === true;
  } catch {
    return false;
  }
}

export async function getValetEnabledUnitIds(): Promise<Set<string>> {
  try {
    const { data, error } = await getValetClient()
      .from('settings')
      .select('unit_id, value')
      .eq('key', 'valet_enabled');
    if (error) return new Set();
    return new Set((data ?? []).filter((r) => r.value === true).map((r) => r.unit_id as string));
  } catch {
    return new Set();
  }
}

/** Carros ativos da unidade + os finalizados hoje (fuso do bar). */
export async function getPanelTickets(unitId: string): Promise<ValetTicket[]> {
  const sb = getValetClient();
  const [active, finished] = await Promise.all([
    sb
      .from('tickets')
      .select(TICKET_COLUMNS)
      .eq('unit_id', unitId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true }),
    sb
      .from('tickets')
      .select(TICKET_COLUMNS)
      .eq('unit_id', unitId)
      .in('status', ['entregue', 'cancelado'])
      .gte('updated_at', barDayStartISO())
      .order('updated_at', { ascending: false }),
  ]);
  return [...((active.data ?? []) as ValetTicket[]), ...((finished.data ?? []) as ValetTicket[])];
}

/** Ticket de uma unidade específica (garante que o motorista só mexe na própria). */
export async function getUnitTicket(unitId: string, ticketId: string): Promise<ValetTicket | null> {
  const { data } = await getValetClient()
    .from('tickets')
    .select(TICKET_COLUMNS)
    .eq('id', ticketId)
    .eq('unit_id', unitId)
    .maybeSingle();
  return (data as ValetTicket) ?? null;
}

/** Quais das fotos obrigatórias já existem numa fase. */
export async function getTakenSlots(ticketId: string, phase: PhotoPhase): Promise<Set<PhotoSlot>> {
  const { data } = await getValetClient()
    .from('photos')
    .select('slot')
    .eq('ticket_id', ticketId)
    .eq('phase', phase)
    .is('deleted_at', null);
  return new Set((data ?? []).map((r) => r.slot as PhotoSlot));
}

/** Fotos de um ticket com URL assinada (válida por 1h). */
export async function getTicketPhotos(ticketId: string): Promise<ValetPhoto[]> {
  const sb = getValetClient();
  const { data } = await sb
    .from('photos')
    .select('id, ticket_id, phase, slot, storage_path, created_at, deleted_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  const rows = (data ?? []) as (Omit<ValetPhoto, 'url'> & {
    storage_path: string;
    deleted_at: string | null;
  })[];

  const livePaths = rows.filter((r) => !r.deleted_at).map((r) => r.storage_path);
  const urlByPath = new Map<string, string>();
  if (livePaths.length > 0) {
    const { data: signed } = await sb.storage.from(VALET_BUCKET).createSignedUrls(livePaths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  return rows.map((r) => ({
    id: r.id,
    ticket_id: r.ticket_id,
    phase: r.phase,
    slot: r.slot,
    created_at: r.created_at,
    url: r.deleted_at ? null : (urlByPath.get(r.storage_path) ?? null),
  }));
}
