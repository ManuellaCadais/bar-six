import Link from 'next/link';
import { getActiveUnits } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * Raiz do site: cada unidade tem seu próprio QR apontando direto pra
 * `/{code}` — ninguém deveria cair aqui no dia a dia. Serve como uma
 * lista simples de unidades, útil pra testar ou navegar manualmente.
 */
export default async function UnitPickerPage() {
  const units = await getActiveUnits();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/six-logo.png"
        alt="SIX Wowness Club"
        className="h-24 w-24 object-contain drop-shadow-sm"
      />
      <p className="eyebrow mt-4 text-[0.62rem]">Wowness Club · Cardápio</p>
      <h1 className="mt-2 font-heading text-xl uppercase tracking-wide text-text-hi">
        Selecione sua unidade
      </h1>

      <div className="mt-8 w-full space-y-2.5">
        {units.length === 0 ? (
          <p className="text-sm text-text-mid">Nenhuma unidade disponível no momento.</p>
        ) : (
          units.map((u) => (
            <Link
              key={u.id}
              href={`/${u.code.toLowerCase()}`}
              className="card-cream block w-full rounded-2xl px-5 py-4 text-left font-heading uppercase tracking-wide text-ink transition hover:brightness-95"
            >
              {u.name}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
