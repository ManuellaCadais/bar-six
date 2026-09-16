import Link from 'next/link';
import { Seal } from '@/components/brand';
import { logout } from '@/lib/actions/auth';

/**
 * Tela de "logado, mas sem permissão pra esta área" — no lugar de uma
 * exceção. Oferece o caminho que a pessoa TEM (painel do bar, se puder)
 * e a saída pra entrar com outra conta.
 */
export function NoAccess({
  area,
  fullName,
  canViewBar,
}: {
  area: 'bar' | 'admin' | 'valet' | 'equipe';
  fullName: string | null;
  canViewBar: boolean;
}) {
  const what = {
    bar: 'ao painel do bar',
    admin: 'ao admin do cardápio',
    valet: 'ao painel do valet',
    equipe: 'ao bar nem ao valet',
  }[area];

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <Seal className="mx-auto h-14 w-14 text-cream/75" />
        <p className="eyebrow mt-4 text-[0.6rem]">SIX Wowness Club</p>
        <h1 className="mt-1 font-heading text-2xl uppercase tracking-wide">Sem acesso</h1>
        <p className="mt-3 text-sm text-text-mid">
          {fullName ? <strong className="text-text-hi">{fullName}</strong> : 'Sua conta'} não tem
          acesso {what}. Se precisar, peça pro gestor da unidade liberar na tela Acessos do
          Sistema Operacional SIX.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {area === 'admin' && canViewBar && (
            <Link href="/bar" className="btn-primary px-5 py-2.5 text-xs">
              Ir pro painel do bar
            </Link>
          )}
          <form action={logout}>
            <button className="btn-ghost w-full px-5 py-2.5 text-xs">Sair e entrar com outra conta</button>
          </form>
        </div>
      </div>
    </div>
  );
}
