import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getUnitByCode } from '@/lib/queries';
import { isValetEnabled } from '@/lib/valet/queries';
import { StudentValet } from '@/components/valet/student-valet';
import { ComingSoon } from '../menu-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ unit: string }>;
}): Promise<Metadata> {
  const { unit } = await params;
  const found = await getUnitByCode(unit);
  return { title: found ? `Valet · ${found.name}` : 'Valet' };
}

export default async function UnitValetPage({
  params,
}: {
  params: Promise<{ unit: string }>;
}) {
  const { unit: unitCode } = await params;
  const unit = await getUnitByCode(unitCode);
  if (!unit) notFound();

  const slug = unit.code.toLowerCase();
  if (!(await isValetEnabled(unit.id))) {
    return (
      <ComingSoon
        unitName={unit.name}
        title="Valet indisponível"
        text="O valet não está disponível nesta unidade no momento."
        backHref={`/${slug}`}
        backLabel="← Voltar"
      />
    );
  }

  return <StudentValet unitCode={slug} unitName={unit.name} />;
}
