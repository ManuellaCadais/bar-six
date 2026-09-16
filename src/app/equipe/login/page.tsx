import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrar · Bar / Valet' };

export default async function EquipeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/equipe') ? next : '/equipe';
  return <LoginForm area="equipe" next={safeNext} />;
}
