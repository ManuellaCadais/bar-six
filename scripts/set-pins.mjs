#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  Define/atualiza os PINs do painel do bar e do admin.
//  Alternativa opcional ao formulário de "primeiro acesso".
//
//  Uso (carregando o .env.local):
//    node --env-file=.env.local scripts/set-pins.mjs --bar 2468 --admin 1379
//
//  Requer no ambiente: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//  SESSION_SECRET (o mesmo valor usado pela aplicação).
// ─────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.SESSION_SECRET;
const barPin = arg('bar');
const adminPin = arg('admin');

if (!url || !serviceKey || !secret) {
  console.error(
    'Faltam variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SESSION_SECRET.',
  );
  process.exit(1);
}
if (!barPin && !adminPin) {
  console.error('Informe ao menos --bar <pin> e/ou --admin <pin> (4 a 8 dígitos).');
  process.exit(1);
}

// Precisa bater com hashPin() em src/lib/auth.ts
const hashPin = (pin) => createHash('sha256').update(`${pin.trim()}::${secret}`).digest('hex');

const sb = createClient(url, serviceKey, {
  db: { schema: 'bar' }, // schema isolado do bar — nunca `public` (six_control)
  auth: { persistSession: false },
});

const rows = [];
for (const [area, pin] of [
  ['bar_pin_hash', barPin],
  ['admin_pin_hash', adminPin],
]) {
  if (!pin) continue;
  if (!/^\d{4,8}$/.test(pin)) {
    console.error(`PIN inválido para ${area}: use de 4 a 8 dígitos.`);
    process.exit(1);
  }
  rows.push({ key: area, value: hashPin(pin), is_public: false, updated_at: new Date().toISOString() });
}

const { error } = await sb.from('settings').upsert(rows, { onConflict: 'key' });
if (error) {
  console.error('Falha ao gravar PINs:', error.message);
  process.exit(1);
}
console.log(`PIN(s) atualizado(s): ${rows.map((r) => r.key).join(', ')}`);
