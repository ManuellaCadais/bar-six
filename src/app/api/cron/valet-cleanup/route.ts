import { NextResponse, type NextRequest } from 'next/server';
import { getValetClient, VALET_BUCKET } from '@/lib/supabase/admin';
import { PHOTO_RETENTION_DAYS } from '@/lib/valet/constants';

// Rotina diária (vercel.json → crons): apaga do storage as fotos do valet
// com mais de 30 dias e marca deleted_at. O registro do ticket continua;
// só o arquivo sai — é o que mantém o Supabase dentro do plano gratuito.
//
// A Vercel chama com "Authorization: Bearer <CRON_SECRET>" quando a env
// CRON_SECRET existe no projeto. Sem ela configurada a rota recusa tudo.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = getValetClient();
  const cutoff = new Date(Date.now() - PHOTO_RETENTION_DAYS * 86400000).toISOString();
  let removed = 0;

  // Em lotes, pra não estourar tempo/limites numa execução só.
  for (let round = 0; round < 20; round++) {
    const { data, error } = await sb
      .from('photos')
      .select('id, storage_path')
      .is('deleted_at', null)
      .lt('created_at', cutoff)
      .limit(100);
    if (error) return NextResponse.json({ error: error.message, removed }, { status: 500 });
    if (!data?.length) break;

    const { error: rmError } = await sb.storage.from(VALET_BUCKET).remove(data.map((p) => p.storage_path));
    if (rmError) return NextResponse.json({ error: rmError.message, removed }, { status: 500 });

    await sb
      .from('photos')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', data.map((p) => p.id));
    removed += data.length;
  }

  return NextResponse.json({ ok: true, removed });
}
