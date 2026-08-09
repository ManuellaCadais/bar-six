import { Anton, Oswald, Inter, Cormorant_Garamond } from 'next/font/google';

/** SIX wordmark / display — condensada, pesada, imponente (estilo do logo). */
export const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
});

/** Títulos de categoria / seção — condensada, versalete com tracking. */
export const oswald = Oswald({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
});

/** Corpo — sans limpa. */
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/** Serifa itálica elegante — reservada à assinatura "Drinks Six Health". */
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const fontVariables = `${anton.variable} ${oswald.variable} ${inter.variable} ${cormorant.variable}`;
