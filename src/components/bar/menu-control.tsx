'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { toggleItemAvailability } from '@/lib/actions/bar';
import type { CategoryWithItems } from '@/lib/types';

export function MenuControl({
  open,
  onClose,
  menu,
}: {
  open: boolean;
  onClose: () => void;
  menu: CategoryWithItems[];
}) {
  const [avail, setAvail] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const c of menu) for (const it of c.items) m[it.id] = it.is_available;
    return m;
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  function toggle(id: string, next: boolean) {
    setAvail((p) => ({ ...p, [id]: next }));
    setPendingId(id);
    start(async () => {
      const res = await toggleItemAvailability(id, next);
      if (!res.ok) setAvail((p) => ({ ...p, [id]: !next })); // reverte em falha
      setPendingId(null);
    });
  }

  return (
    <div
      className={cn('fixed inset-0 z-40', open ? '' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-hairline bg-ink-soft shadow-soft transition-transform duration-300 ease-lux',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Disponibilidade de itens"
      >
        <header className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div>
            <p className="eyebrow text-[0.6rem]">Disponibilidade</p>
            <h2 className="font-heading text-xl uppercase tracking-wide">Itens do cardápio</h2>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-hairline text-text-mid hover:text-text-hi"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        <p className="px-5 pt-3 text-xs text-text-low">
          Desligar um item o remove do cardápio do aluno na próxima abertura.
        </p>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {menu.map((c) => (
            <div key={c.id}>
              <h3 className="category-title text-sm text-text-mid flex items-center gap-2">
                <span className="plate-bullet" style={{ color: c.color }} />
                {c.name}
              </h3>
              <ul className="mt-2 divide-y divide-hairline">
                {c.items.map((it) => {
                  const on = avail[it.id];
                  return (
                    <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span
                        className={cn(
                          'text-sm',
                          on ? 'text-text-hi' : 'text-text-low line-through',
                        )}
                      >
                        {it.name}
                      </span>
                      <button
                        role="switch"
                        aria-checked={on}
                        aria-label={`${it.name}: ${on ? 'disponível' : 'indisponível'}`}
                        disabled={pendingId === it.id}
                        onClick={() => toggle(it.id, !on)}
                        className={cn(
                          'relative h-7 w-12 flex-none rounded-full transition-colors',
                          on ? 'bg-cream' : 'bg-white/15',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-6 w-6 rounded-full bg-ink transition-transform',
                            on ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
