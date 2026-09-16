import type { Metadata } from 'next';
import { getAdminMenu, getPublicSettings, getOverallItemStats } from '@/lib/queries';
import { getPageAccess } from '@/lib/session';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { NoAccess } from '@/components/auth/no-access';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin do Cardápio' };

export default async function AdminPage() {
  const { session, allowed } = await getPageAccess('admin');
  if (!allowed) {
    return (
      <NoAccess
        area="admin"
        fullName={session.fullName}
        canViewBar={session.permissions.canViewBar}
      />
    );
  }

  const [{ menu }, settings, stats] = await Promise.all([
    getAdminMenu(session.unitId),
    getPublicSettings(session.unitId),
    getOverallItemStats(session.unitId),
  ]);

  return (
    <AdminDashboard
      key={session.unitId}
      menu={menu}
      settings={settings}
      stats={stats}
      unitId={session.unitId}
      unitName={session.unitName}
      unitCode={session.unitCode}
      availableUnits={session.availableUnits}
      canViewAllUnits={session.permissions.canViewAllUnits}
    />
  );
}
