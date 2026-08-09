import type { Metadata } from 'next';
import { pinStatus } from '@/lib/actions/auth';
import { PinGate } from '@/components/auth/pin-gate';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrar · Admin' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const { configured } = await pinStatus('admin');
  const safeNext = next && next.startsWith('/admin') ? next : '/admin';
  return <PinGate area="admin" configured={configured} next={safeNext} />;
}
