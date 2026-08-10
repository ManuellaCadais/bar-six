'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Seal } from '@/components/brand';
import { logout } from '@/lib/actions/auth';
import type { Category, CategoryWithItems, PublicSettings } from '@/lib/types';
import type { OverallStats } from '@/lib/queries';
import { CategoryEditor, NewCategory } from './category-editor';
import { SettingsEditor } from './settings-editor';
import { ReportsPanel } from './reports-panel';

export function AdminDashboard({
  menu,
  settings,
  stats,
}: {
  menu: CategoryWithItems[];
  settings: PublicSettings;
  stats: OverallStats;
}) {
  const [tab, setTab] = useState<'menu' | 'reports' | 'settings'>('menu');
  const categories: Category[] = menu.map((c) => ({ ...c }));

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-hairline bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Seal className="h-9 w-9 text-cream/80" />
            <div>
              <p className="eyebrow text-[0.55rem]">Admin do Cardápio</p>
              <p className="font-heading text-lg uppercase leading-none tracking-wide">
                SIX Wowness Club
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/bar"
              className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi"
            >
              Painel do bar
            </Link>
            <Link
              href="/"
              className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi"
            >
              Ver cardápio
            </Link>
            <form action={logout}>
              <button className="chip border border-hairline px-3 py-2 text-xs uppercase tracking-widest text-text-mid hover:text-text-hi">
                Sair
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-2 px-4 pb-3">
          {(['menu', 'reports', 'settings'] as const).map((t) => (
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
              {t === 'menu' ? 'Cardápio' : t === 'reports' ? 'Relatórios' : 'Ajustes'}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'menu' && (
          <div className="space-y-5">
            {menu.map((c) => (
              <CategoryEditor key={c.id} category={c} categories={categories} />
            ))}
            <NewCategory />
          </div>
        )}
        {tab === 'reports' && <ReportsPanel stats={stats} />}
        {tab === 'settings' && <SettingsEditor settings={settings} />}
      </main>
    </div>
  );
}
