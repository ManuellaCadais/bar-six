import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { QrGenerator } from '@/components/qr/qr-generator';
import { getActiveUnits } from '@/lib/queries';
import { getValetEnabledUnitIds } from '@/lib/valet/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gerador de QR Code' };

export default async function QrPage() {
  // Prioriza a URL de produção configurada; senão, deduz do host da requisição.
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  if (!siteUrl) {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
    const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
    siteUrl = `${proto}://${host}`;
  }
  const [units, valetIds] = await Promise.all([getActiveUnits(), getValetEnabledUnitIds()]);
  return (
    <QrGenerator siteUrl={siteUrl} units={units.map((u) => ({ ...u, valet: valetIds.has(u.id) }))} />
  );
}
