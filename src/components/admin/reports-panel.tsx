import type { OverallStats } from '@/lib/queries';

function RankRow({
  rank,
  label,
  sublabel,
  count,
  maxCount,
}: {
  rank: number;
  label: string;
  sublabel?: string | null;
  count: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? Math.max(4, Math.round((count / maxCount) * 100)) : 0;
  return (
    <li className="relative overflow-hidden rounded-xl border border-hairline">
      <div
        className="absolute inset-y-0 left-0 bg-cream/[0.08]"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className="relative flex items-center gap-3 px-4 py-3">
        <span className="font-heading text-sm tabular-nums text-text-low w-6 flex-none">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-text-hi">{label}</p>
          {sublabel && <p className="truncate text-xs text-text-mid">{sublabel}</p>}
        </div>
        <span className="font-heading text-lg tabular-nums text-cream flex-none">
          {count}
        </span>
      </div>
    </li>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface-card px-5 py-4">
      <p className="text-[0.6rem] uppercase tracking-widest text-text-low">{label}</p>
      <p className="mt-1 font-heading text-2xl text-cream tabular-nums truncate">{value}</p>
    </div>
  );
}

export function ReportsPanel({ stats }: { stats: OverallStats }) {
  const topOverall = stats.byItem[0];
  const topVariant = stats.byVariant[0];
  const maxItem = stats.byItem[0]?.count ?? 0;
  const maxVariant = stats.byVariant[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pedidos (todos os tempos)" value={stats.totalOrders} />
        <StatCard label="Itens com saída" value={stats.totalItemsSold} />
        <StatCard label="Bebida com mais saídas" value={topOverall?.name ?? '—'} />
        <StatCard
          label="Variante com mais saídas"
          value={
            topVariant
              ? `${topVariant.itemName}${topVariant.variantLabel ? ` — ${topVariant.variantLabel}` : ''}`
              : '—'
          }
        />
      </div>

      {stats.byItem.length === 0 ? (
        <p className="text-sm text-text-low">
          Ainda não há pedidos suficientes para gerar estatísticas.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="eyebrow text-[0.6rem] mb-3">Ranking por bebida</h2>
            <ol className="space-y-2">
              {stats.byItem.map((it, i) => (
                <RankRow
                  key={it.name}
                  rank={i + 1}
                  label={it.name}
                  sublabel={`${it.orders} pedido${it.orders === 1 ? '' : 's'}`}
                  count={it.count}
                  maxCount={maxItem}
                />
              ))}
            </ol>
          </section>

          <section>
            <h2 className="eyebrow text-[0.6rem] mb-3">
              Ranking por variante
              <span className="ml-2 normal-case tracking-normal text-text-low">
                (bebida + personalização)
              </span>
            </h2>
            <ol className="space-y-2">
              {stats.byVariant.map((v, i) => (
                <RankRow
                  key={`${v.itemName}::${v.variantLabel ?? ''}`}
                  rank={i + 1}
                  label={v.itemName}
                  sublabel={v.variantLabel}
                  count={v.count}
                  maxCount={maxVariant}
                />
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
