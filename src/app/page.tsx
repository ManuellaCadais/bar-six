import Link from 'next/link';
import { getActiveUnits, getLiveMenuUnitIds } from '@/lib/queries';
import { getValetEnabledUnitIds } from '@/lib/valet/queries';

export const dynamic = 'force-dynamic';

/**
 * Raiz do site: cada unidade tem seu próprio QR apontando direto pra
 * `/{code}` — ninguém deveria cair aqui no dia a dia. Serve como uma
 * lista simples de unidades, útil pra testar ou navegar manualmente.
 */
export default async function UnitPickerPage() {
  const [units, menuLive, valetLive] = await Promise.all([
    getActiveUnits(),
    getLiveMenuUnitIds(),
    getValetEnabledUnitIds(),
  ]);
  // Unidade "no ar" pro aluno: tem cardápio publicado OU valet ligado.
  const live = new Set([...menuLive, ...valetLive]);

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
          units.map((u) =>
            live.has(u.id) ? (
              <Link
                key={u.id}
                href={`/${u.code.toLowerCase()}`}
                className="card-cream block w-full rounded-2xl px-5 py-4 text-left font-heading uppercase tracking-wide text-ink transition hover:brightness-95"
              >
                {u.name}
              </Link>
            ) : (
              <div
                key={u.id}
                className="flex w-full items-center justify-between rounded-2xl border border-hairline px-5 py-4 text-left font-heading uppercase tracking-wide text-text-low"
              >
                {u.name}
                <span className="text-[0.6rem] tracking-[0.2em]">Em breve</span>
              </div>
            ),
          )
        )}
      </div>

      {/* Saída pra equipe interna: quem é da SIX e cair aqui por engano
          (digitando o domínio) chega no painel sem precisar adivinhar a URL.
          É rota protegida por login — pro aluno é só um link que pede senha. */}
      <Link
        href="/equipe"
        className="mt-10 text-[0.6rem] uppercase tracking-[0.2em] text-text-low transition hover:text-text-mid"
      >
        Equipe SIX · Bar / Valet
      </Link>
    </div>
  );
}
