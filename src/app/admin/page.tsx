import type { Metadata } from 'next';
import { getAdminMenu, getPublicSettings, getOverallItemStats } from '@/lib/queries';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin do Cardápio' };

export default async function AdminPage() {
  const [{ menu }, settings, stats] = await Promise.all([
    getAdminMenu(),
    getPublicSettings(),
    getOverallItemStats(),
  ]);
  return <AdminDashboard menu={menu} settings={settings} stats={stats} />;
}
