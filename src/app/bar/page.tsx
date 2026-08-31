import type { Metadata } from 'next';
import {
  getActiveOrders,
  getTodayHistory,
  getAdminMenu,
  getPublicSettings,
} from '@/lib/queries';
import { requireRole } from '@/lib/session';
import { barNow } from '@/lib/datetime';
import { BarPanel } from '@/components/bar/bar-panel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Painel do Bar' };

export default async function BarPage() {
  const session = await requireRole('bar');

  const [active, history, { menu }, settings] = await Promise.all([
    getActiveOrders(session.unitId),
    getTodayHistory(session.unitId),
    getAdminMenu(session.unitId),
    getPublicSettings(session.unitId),
  ]);
  const { date } = barNow();

  return (
    <BarPanel
      // Força remontar o componente ao trocar de unidade (seletor) — sem
      // isso o estado local (orders, canal de realtime) ficaria preso na
      // unidade antiga, já que só as props mudariam.
      key={session.unitId}
      initialOrders={[...active, ...history]}
      menu={menu}
      barOpen={settings.bar_open}
      alertMinutes={settings.alert_minutes}
      divirtaDate={settings.divirta_manual_date}
      proteinOfDay={settings.protein_of_day}
      todayDate={date}
      unitId={session.unitId}
      unitName={session.unitName}
      availableUnits={session.availableUnits}
    />
  );
}
