import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrar · Admin' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/admin') ? next : '/admin';
  return <LoginForm area="admin" next={safeNext} />;
}
