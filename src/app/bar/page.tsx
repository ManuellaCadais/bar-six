import type { Metadata } from 'next';
import {
  getActiveOrders,
  getTodayHistory,
  getAdminMenu,
  getPublicSettings,
} from '@/lib/queries';
import { barNow } from '@/lib/datetime';
import { BarPanel } from '@/components/bar/bar-panel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Painel do Bar' };

export default async function BarPage() {
  const [active, history, { menu }, settings] = await Promise.all([
    getActiveOrders(),
    getTodayHistory(),
    getAdminMenu(),
    getPublicSettings(),
  ]);
  const { date } = barNow();

  return (
    <BarPanel
      initialOrders={[...active, ...history]}
      menu={menu}
      barOpen={settings.bar_open}
      alertMinutes={settings.alert_minutes}
      divirtaDate={settings.divirta_manual_date}
      todayDate={date}
    />
  );
}
