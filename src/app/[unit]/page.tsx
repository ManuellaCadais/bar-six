import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStudentMenu, getUnitByCode } from '@/lib/queries';
import { StudentMenu } from '@/components/menu/student-menu';

// Sempre renderiza fresco: disponibilidade de itens/categorias muda sem deploy.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ unit: string }>;
}): Promise<Metadata> {
  const { unit } = await params;
  const found = await getUnitByCode(unit);
  return { title: found ? `Cardápio · ${found.name}` : 'Cardápio' };
}

export default async function UnitMenuPage({
  params,
}: {
  params: Promise<{ unit: string }>;
}) {
  const { unit: unitCode } = await params;
  const unit = await getUnitByCode(unitCode);
  if (!unit) notFound();

  const { menu, settings } = await getStudentMenu(unit.id);

  // Sem cardápio, ou clonado e ainda não revisado: aluno não vê nem pede nada
  // (o servidor também recusa — ver submitOrder).
  if (menu.length === 0 || settings.menu_review_pending) {
    return <MenuComingSoon unitName={unit.name} />;
  }

  return (
    <StudentMenu
      menu={menu}
      settings={settings}
      unitCode={unit.code.toLowerCase()}
      unitName={unit.name}
    />
  );
}

function MenuComingSoon({ unitName }: { unitName: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/six-logo.png" alt="SIX Wowness Club" className="h-24 w-24 object-contain" />
      <p className="eyebrow mt-4 text-[0.62rem]">Wowness Club · {unitName}</p>
      <h1 className="mt-2 font-heading text-xl uppercase tracking-wide text-text-hi">
        Cardápio em breve
      </h1>
      <p className="mt-3 text-sm text-text-mid">
        O cardápio do bar desta unidade ainda está sendo preparado.
      </p>
      <Link
        href="/"
        className="mt-8 text-[0.65rem] uppercase tracking-[0.2em] text-text-low hover:text-text-mid"
      >
        ← Outras unidades
      </Link>
    </div>
  );
}
