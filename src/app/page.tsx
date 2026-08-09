import { getStudentMenu } from '@/lib/queries';
import { StudentMenu } from '@/components/menu/student-menu';

// Sempre renderiza fresco: disponibilidade de itens/categorias muda sem deploy.
export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const { menu, settings } = await getStudentMenu();
  return <StudentMenu menu={menu} settings={settings} />;
}
