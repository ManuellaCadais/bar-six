import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrar · Painel do Valet' };

export default async function ValetLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/valet') ? next : '/valet';
  return <LoginForm area="valet" next={safeNext} />;
}
