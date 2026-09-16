import type { Metadata } from 'next';
import { getPageAccess } from '@/lib/session';
import { getPanelTickets, isValetEnabled } from '@/lib/valet/queries';
import { ValetPanel } from '@/components/valet/valet-panel';
import { NoAccess } from '@/components/auth/no-access';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Painel do Valet' };

export default async function ValetPage() {
  const { session, allowed } = await getPageAccess('valet');
  if (!allowed) {
    return <NoAccess area="valet" fullName={session.fullName} canViewBar={session.permissions.canViewBar} />;
  }

  const [tickets, enabled] = await Promise.all([
    getPanelTickets(session.unitId),
    isValetEnabled(session.unitId),
  ]);

  return (
    <ValetPanel
      key={session.unitId}
      initialTickets={tickets}
      enabled={enabled}
      unitId={session.unitId}
      unitName={session.unitName}
      availableUnits={session.availableUnits}
      canManage={session.permissions.canManageValet}
    />
  );
}
