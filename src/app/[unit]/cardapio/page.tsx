import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getUnitByCode } from '@/lib/queries';
import { isValetEnabled } from '@/lib/valet/queries';
import { UnitMenu } from '../menu-page';

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

export default async function UnitCardapioPage({
  params,
}: {
  params: Promise<{ unit: string }>;
}) {
  const { unit: unitCode } = await params;
  const unit = await getUnitByCode(unitCode);
  if (!unit) notFound();
  return <UnitMenu unit={unit} backToChooser={await isValetEnabled(unit.id)} />;
}
