import type { Metadata } from 'next';
import { getAdminMenu, getPublicSettings, getOverallItemStats } from '@/lib/queries';
import { requireRole } from '@/lib/session';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin do Cardápio' };

export default async function AdminPage() {
  const session = await requireRole('admin');

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
