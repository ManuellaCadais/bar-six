'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Seal } from '@/components/brand';
import { logout } from '@/lib/actions/auth';
import { markMenuReviewed } from '@/lib/actions/bar';
import { UnitSwitcher } from '@/components/unit-switcher';
import type { Category, CategoryWithItems, PublicSettings } from '@/lib/types';
import type { OverallStats } from '@/lib/queries';
import type { UnitOption } from '@/lib/session';
import { CategoryEditor, NewCategory } from './category-editor';
import { SettingsEditor } from './settings-editor';
import { ReportsPanel } from './reports-panel';
import { UnitsPanel } from './units-panel';

export function AdminDashboard({
  menu,
  settings,
  stats,
  unitId,
  unitName,
  unitCode,
  availableUnits,
  canViewAllUnits,
}: {
  menu: CategoryWithItems[];
  settings: PublicSettings;
  stats: OverallStats;
  unitId: string;
  unitName: string;
  unitCode: string;
  availableUnits: UnitOption[] | null;
  canViewAllUnits: boolean;
}) {
  const tabs = canViewAllUnits
    ? (['menu', 'reports', 'settings', 'units'] as const)
    : (['menu', 'reports', 'settings'] as const);
  const [tab, setTab] = useState<(typeof tabs)[number]>('menu');
  const categories: Category[] = menu.map((c) => ({ ...c }));

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-hairline bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Seal className="h-9 w-9 text-cream/80" />
            <div>
              <p className="eyebrow text-[0.55rem]">
                Admin do Cardápio
                {!availableUnits && <span className="text-cream/70"> · {unitName}</span>}
              </p>
              <p className="font-heading text-lg uppercase leading-none tracking-wide">
                SIX Wowness Club
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {availableUnits && <UnitSwitcher current={unitId} units={availableUnits} />}
            <Link
              href="/bar"
              className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi"
            >
              Painel do bar
            </Link>
            <Link
              href={`/${unitCode}`}
              className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi"
            >
              Ver cardápio
            </Link>
            <Link
              href="/qr"
              className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi"
            >
              QR Code
            </Link>
            <form action={logout}>
              <button className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi">
                Sair
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-2 px-4 pb-3">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs uppercase tracking-widest transition',
                tab === t
                  ? 'bg-cream text-ink'
                  : 'border border-hairline text-text-mid hover:text-text-hi',
              )}
            >
              {t === 'menu' && 'Cardápio'}
              {t === 'reports' && 'Relatórios'}
              {t === 'settings' && 'Ajustes'}
              {t === 'units' && 'Unidades'}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {settings.menu_review_pending && <MenuReviewBanner unitName={unitName} />}

        {tab === 'menu' && (
          <div className="space-y-5">
            {menu.length === 0 && (
              <p className="surface-card p-5 text-sm text-text-mid">
                Essa unidade ainda não tem cardápio. Se você tem acesso à aba{' '}
                <strong>Unidades</strong>, dá pra clonar o cardápio de outra unidade como ponto
                de partida.
              </p>
            )}
            {menu.map((c) => (
              <CategoryEditor key={c.id} category={c} categories={categories} />
            ))}
            <NewCategory />
          </div>
        )}
        {tab === 'reports' && <ReportsPanel stats={stats} />}
        {tab === 'settings' && <SettingsEditor settings={settings} />}
        {tab === 'units' && availableUnits && (
          <UnitsPanel currentUnitId={unitId} units={availableUnits} />
        )}
      </main>
    </div>
  );
}

/**
 * Faixa fixa avisando que o cardápio foi clonado de outra unidade — não
 * some sozinha, só quando alguém confirmar que revisou item por item.
 */
function MenuReviewBanner({ unitName }: { unitName: string }) {
  const [pending, startTransition] = useTransition();
  const [dismissing, setDismissing] = useState(false);

  function confirm() {
    setDismissing(true);
    startTransition(async () => {
      const r = await markMenuReviewed();
      if (!r.ok) setDismissing(false);
    });
  }

  return (
    <div className="mb-5 rounded-xl border border-hibiscus bg-hibiscus/15 px-5 py-4">
      <p className="font-heading text-sm uppercase tracking-wide text-strawberry">
        Cardápio copiado — revisão pendente
      </p>
      <p className="mt-1 text-sm text-strawberry/90">
        Este cardápio de <strong>{unitName}</strong> foi copiado de outra unidade como modelo.
        Revise cada categoria e item (nomes, sabores, disponibilidade) antes de divulgar o QR
        desta unidade pros alunos.
      </p>
      <button
        className="btn-danger mt-3 px-4 py-2 text-xs"
        onClick={confirm}
        disabled={pending || dismissing}
      >
        {pending || dismissing ? 'Confirmando…' : 'Já revisei o cardápio desta unidade'}
      </button>
    </div>
  );
}
