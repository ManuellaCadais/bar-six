import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getUnitByCode } from '@/lib/queries';
import { isValetEnabled } from '@/lib/valet/queries';
import { UnitMenu } from './menu-page';

// Sempre renderiza fresco: disponibilidade de itens/categorias muda sem deploy.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ unit: string }>;
}): Promise<Metadata> {
  const { unit } = await params;
  const found = await getUnitByCode(unit);
  return { title: found ? `SIX · ${found.name}` : 'SIX' };
}

/**
 * Destino do QR Code da unidade. Sem valet ligado: abre o cardápio direto
 * (como sempre foi). Com valet ligado: "O que deseja hoje?" — Bar ou Valet.
 */
export default async function UnitHomePage({
  params,
}: {
  params: Promise<{ unit: string }>;
}) {
  const { unit: unitCode } = await params;
  const unit = await getUnitByCode(unitCode);
  if (!unit) notFound();

  if (!(await isValetEnabled(unit.id))) {
    return <UnitMenu unit={unit} backToChooser={false} />;
  }

  const slug = unit.code.toLowerCase();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/six-logo.png" alt="SIX Wowness Club" className="h-24 w-24 object-contain drop-shadow-sm" />
      <p className="eyebrow mt-4 text-[0.62rem]">Wowness Club · {unit.name}</p>
      <h1 className="mt-2 font-heading text-2xl uppercase tracking-wide text-text-hi">O que deseja hoje?</h1>

      <div className="mt-8 w-full space-y-3">
        <Link
          href={`/${slug}/cardapio`}
          className="card-cream block w-full rounded-2xl px-6 py-5 text-left text-ink transition hover:brightness-95"
        >
          <span className="block font-heading text-xl uppercase tracking-wide">Pedido para o Bar</span>
          <span className="block text-sm text-ink/70">Drinks, cafés e shakes — entregues onde você estiver.</span>
        </Link>
        <Link
          href={`/${slug}/valet`}
          className="card-cream block w-full rounded-2xl px-6 py-5 text-left text-ink transition hover:brightness-95"
        >
          <span className="block font-heading text-xl uppercase tracking-wide">Valet</span>
          <span className="block text-sm text-ink/70">Deixe seu carro ou peça pra buscarem na saída.</span>
        </Link>
      </div>
    </div>
  );
}
