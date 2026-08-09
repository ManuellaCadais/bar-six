import type { Metadata } from 'next';
import { pinStatus } from '@/lib/actions/auth';
import { PinGate } from '@/components/auth/pin-gate';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrar · Painel do Bar' };

export default async function BarLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const { configured } = await pinStatus('bar');
  const safeNext = next && next.startsWith('/bar') ? next : '/bar';
  return <PinGate area="bar" configured={configured} next={safeNext} />;
}
