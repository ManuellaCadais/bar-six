import { barNow } from './datetime';
import type { Category, PublicSettings } from './types';

/**
 * A categoria está liberada para pedidos hoje?
 *
 * Regras:
 *  - available_days = null  → disponível todos os dias.
 *  - available_days lista os dias (0=Dom … 6=Sáb) em que a categoria aparece.
 *  - Liberação manual (feriado): se settings.divirta_manual_date == hoje,
 *    categorias com restrição de dias ficam liberadas até o fim do dia.
 *    (O botão "Liberar Divirta-se hoje" no painel do bar grava essa data.)
 */
export function isCategoryAvailableToday(
  category: Pick<Category, 'available_days'>,
  settings: Pick<PublicSettings, 'divirta_manual_date'>,
  now: Date = new Date(),
): boolean {
  if (!category.available_days || category.available_days.length === 0) {
    return true;
  }

  const { date, weekday } = barNow(now);

  if (category.available_days.includes(weekday)) return true;

  if (settings.divirta_manual_date && settings.divirta_manual_date === date) {
    return true;
  }

  return false;
}
