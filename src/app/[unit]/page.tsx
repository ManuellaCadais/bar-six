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
  return (
    <StudentMenu
      menu={menu}
      settings={settings}
      unitCode={unit.code.toLowerCase()}
      unitName={unit.name}
    />
  );
}
