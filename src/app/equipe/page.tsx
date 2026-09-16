import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getPageAccess } from '@/lib/session';
import { logout } from '@/lib/actions/auth';
import { Seal } from '@/components/brand';
import { NoAccess } from '@/components/auth/no-access';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bar / Valet' };

/**
 * Porta de entrada da equipe (card "Bar / Valet" do portal). Mostra só as
 * áreas que a pessoa pode abrir; com uma área só, entra direto nela.
 */
export default async function EquipePage() {
  const { session, allowed } = await getPageAccess('equipe');
  if (!allowed) {
    return <NoAccess area="equipe" fullName={session.fullName} canViewBar={false} />;
  }

  const p = session.permissions;
  const areas = [
    p.canViewBar && {
      href: '/bar',
      title: 'Painel do Bar',
      text: 'Fila de pedidos em tempo real, itens e abrir/fechar o bar.',
    },
    p.canManageBarCardapio && {
      href: '/admin',
      title: 'Admin do Cardápio',
      text: 'Cardápio, relatórios, ajustes e cardápio das unidades.',
    },
    p.canViewValet && {
      href: '/valet',
      title: 'Painel do Valet',
      text: 'Carros chegando, estacionados e pedidos de retirada, com fotos.',
    },
  ].filter(Boolean) as { href: string; title: string; text: string }[];

  if (areas.length === 1) redirect(areas[0].href);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <Seal className="h-14 w-14 text-cream/75" />
      <p className="eyebrow mt-4 text-[0.6rem]">
        SIX Wowness Club{session.fullName ? ` · ${session.fullName}` : ''}
      </p>
      <h1 className="mt-1 font-heading text-2xl uppercase tracking-wide">Bar / Valet</h1>

      <div className="mt-8 w-full space-y-3">
        {areas.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="card-cream block w-full rounded-2xl px-6 py-5 text-left text-ink transition hover:brightness-95"
          >
            <span className="block font-heading text-xl uppercase tracking-wide">{a.title}</span>
            <span className="block text-sm text-ink/70">{a.text}</span>
          </Link>
        ))}
      </div>

      <form action={logout} className="mt-8">
        <button className="text-xs uppercase tracking-widest text-text-low hover:text-text-mid">Sair</button>
      </form>
    </div>
  );
}
