/**
 * Formata um preço em Reais. Regra de negócio: preço é OPCIONAL.
 * Sem preço cadastrado (null/undefined), nada relacionado a valor aparece na UI.
 */
export function formatPrice(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/** Formata quantidade de itens ("1 item", "3 itens"). */
export function pluralItems(n: number): string {
  return n === 1 ? '1 item' : `${n} itens`;
}

/** Normaliza o código curto do pedido para exibição (#A1B2). */
export function displayCode(code: string): string {
  return code.startsWith('#') ? code : `#${code}`;
}

/** Remove acentos e baixa caixa — usado para busca/comparações simples. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
