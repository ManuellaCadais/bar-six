import Link from 'next/link';
import { getStudentMenu } from '@/lib/queries';
import { StudentMenu } from '@/components/menu/student-menu';

/**
 * Cardápio do aluno de uma unidade — usado direto em /{unit} (unidade sem
 * valet) e em /{unit}/cardapio (unidade com a tela de escolha Bar/Valet).
 */
export async function UnitMenu({
  unit,
  backToChooser,
}: {
  unit: { id: string; name: string; code: string };
  backToChooser: boolean;
}) {
  const { menu, settings } = await getStudentMenu(unit.id);

  // Sem cardápio, ou clonado e ainda não revisado: aluno não vê nem pede nada
  // (o servidor também recusa — ver submitOrder).
  if (menu.length === 0 || settings.menu_review_pending) {
    return (
      <ComingSoon
        unitName={unit.name}
        title="Cardápio em breve"
        text="O cardápio do bar desta unidade ainda está sendo preparado."
        backHref={backToChooser ? `/${unit.code.toLowerCase()}` : '/'}
        backLabel={backToChooser ? '← Voltar' : '← Outras unidades'}
      />
    );
  }

  return (
    <StudentMenu
      menu={menu}
      settings={settings}
      unitCode={unit.code.toLowerCase()}
      unitName={unit.name}
    />
  );
}

export function ComingSoon({
  unitName,
  title,
  text,
  backHref,
  backLabel,
}: {
  unitName: string;
  title: string;
  text: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/six-logo.png" alt="SIX Wowness Club" className="h-24 w-24 object-contain" />
      <p className="eyebrow mt-4 text-[0.62rem]">Wowness Club · {unitName}</p>
      <h1 className="mt-2 font-heading text-xl uppercase tracking-wide text-text-hi">{title}</h1>
      <p className="mt-3 text-sm text-text-mid">{text}</p>
      <Link
        href={backHref}
        className="mt-8 text-[0.65rem] uppercase tracking-[0.2em] text-text-low hover:text-text-mid"
      >
        {backLabel}
      </Link>
    </div>
  );
}
