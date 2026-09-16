'use server';

import { getValetClient } from '@/lib/supabase/admin';
import { getUnitByCode } from '@/lib/queries';
import { isValetEnabled } from '@/lib/valet/queries';
import {
  normalizeCode,
  normalizePlate,
  type PublicTicketView,
} from '@/lib/valet/constants';

// Ações do ALUNO no valet — sem login. Quem prova que o ticket é seu é o
// public_token (uuid aleatório) que só o celular dele guarda. O código
// curto (#K7P2) serve pra conferência na entrega e pra recuperar o ticket
// em outro celular junto com o final da placa.

type Fail = { ok: false; message: string };

const PUBLIC_COLUMNS =
  'code, status, customer_name, plate, car_model, car_color, cancel_reason, created_at, requested_at, ready_at, delivered_at';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveUnit(unitCode: string) {
  const unit = await getUnitByCode(unitCode);
  if (!unit) return null;
  if (!(await isValetEnabled(unit.id))) return null;
  return unit;
}

/** Aluno chegou: abre o ticket e recebe o código + token. */
export async function createStudentTicket(input: {
  unitCode: string;
  name: string;
  phone: string;
  plate: string;
}): Promise<{ ok: true; token: string; code: string } | Fail> {
  const name = input.name?.trim().slice(0, 60);
  const phone = input.phone?.replace(/[^\d+() -]/g, '').trim().slice(0, 20);
  const plate = normalizePlate(input.plate ?? '');

  if (!name) return { ok: false, message: 'Informe seu nome.' };
  if (!phone || phone.replace(/\D/g, '').length < 10)
    return { ok: false, message: 'Informe um telefone com DDD.' };
  if (plate.length < 7) return { ok: false, message: 'Informe a placa completa do carro.' };

  const unit = await resolveUnit(input.unitCode);
  if (!unit) return { ok: false, message: 'O valet não está disponível nesta unidade.' };

  const sb = getValetClient();
  const { data: existing } = await sb
    .from('tickets')
    .select('id')
    .eq('unit_id', unit.id)
    .eq('plate', plate)
    .not('status', 'in', '(entregue,cancelado)')
    .maybeSingle();
  if (existing)
    return {
      ok: false,
      message: 'Esse carro já está no valet. Se é o seu, use "Já tenho um código".',
    };

  const { data, error } = await sb
    .rpc('create_ticket', {
      p_unit_id: unit.id,
      p_customer_name: name,
      p_customer_phone: phone,
      p_plate: plate,
      p_created_by: 'aluno',
    })
    .single<{ id: string; code: string; public_token: string }>();

  if (error || !data) return { ok: false, message: 'Não foi possível abrir o ticket. Tente de novo.' };
  return { ok: true, token: data.public_token, code: data.code };
}

/** Situação atual do ticket do aluno (a tela consulta a cada poucos segundos). */
export async function getStudentTicket(token: string): Promise<PublicTicketView | null> {
  if (!UUID_RE.test(token ?? '')) return null;
  const { data } = await getValetClient()
    .from('tickets')
    .select(PUBLIC_COLUMNS)
    .eq('public_token', token)
    .maybeSingle();
  return (data as PublicTicketView) ?? null;
}

/** Aluno pede o carro de volta. */
export async function requestCar(token: string): Promise<{ ok: true } | Fail> {
  if (!UUID_RE.test(token ?? '')) return { ok: false, message: 'Ticket inválido.' };
  const { data, error } = await getValetClient()
    .from('tickets')
    .update({ status: 'solicitado', requested_at: new Date().toISOString() })
    .eq('public_token', token)
    .eq('status', 'estacionado')
    .select('id');
  if (error) return { ok: false, message: 'Não foi possível pedir o carro. Tente de novo.' };
  if (!data?.length)
    return { ok: false, message: 'O carro ainda não foi estacionado ou já foi solicitado.' };
  return { ok: true };
}

/** Aluno desistiu antes de o motorista receber o carro. */
export async function cancelStudentTicket(token: string): Promise<{ ok: true } | Fail> {
  if (!UUID_RE.test(token ?? '')) return { ok: false, message: 'Ticket inválido.' };
  const { data } = await getValetClient()
    .from('tickets')
    .update({ status: 'cancelado', cancel_reason: 'Cancelado pelo aluno.' })
    .eq('public_token', token)
    .eq('status', 'aguardando')
    .select('id');
  if (!data?.length)
    return { ok: false, message: 'O motorista já recebeu o carro — fale com o valet.' };
  return { ok: true };
}

/** Outro celular: recupera o ticket pelo código + final da placa. */
export async function recoverTicket(input: {
  unitCode: string;
  code: string;
  plateEnd: string;
}): Promise<{ ok: true; token: string } | Fail> {
  const code = normalizeCode(input.code ?? '');
  const plateEnd = normalizePlate(input.plateEnd ?? '');
  if (code.length !== 4 || plateEnd.length < 3)
    return { ok: false, message: 'Informe o código de 4 caracteres e os 3 últimos da placa.' };

  const unit = await resolveUnit(input.unitCode);
  if (!unit) return { ok: false, message: 'O valet não está disponível nesta unidade.' };

  const { data } = await getValetClient()
    .from('tickets')
    .select('plate, public_token')
    .eq('unit_id', unit.id)
    .eq('code', code)
    .not('status', 'in', '(entregue,cancelado)')
    .maybeSingle<{ plate: string; public_token: string }>();

  if (!data || !data.plate.endsWith(plateEnd))
    return { ok: false, message: 'Não encontramos um carro ativo com esse código e placa.' };
  return { ok: true, token: data.public_token };
}
