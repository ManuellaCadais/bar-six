import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrar · Painel do Bar' };

export default async function BarLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/bar') ? next : '/bar';
  return <LoginForm area="bar" next={safeNext} />;
}
