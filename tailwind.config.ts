import type { Config } from 'tailwindcss';

/**
 * Tema visual SIX Wowness Club.
 * Coquetelaria de luxo: preto quente, superfícies cinza-chumbo,
 * creme dos copos SIX como destaque, acentos vindos das cores dos drinks.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Fundo preto quente, quase absoluto + superfícies
        ink: '#0B0B0A',
        'ink-soft': '#121110',
        surface: '#1C1C1C',
        'surface-2': '#242322',
        'surface-3': '#2E2C2A',
        // Creme dos copos SIX — destaque primário
        cream: '#E9DCC3',
        'cream-dim': '#D4C6A9',
        'cream-deep': '#B8A784',
        // Acentos vibrantes das cores dos drinks
        hibiscus: '#B3122F',
        mango: '#F2A900',
        strawberry: '#E8A7A0',
        // Madeira, detalhe sutil
        wood: '#8A5A2B',
        // Texto
        'text-hi': '#F4EEE2',
        'text-mid': '#B7AFA2',
        'text-low': '#807A70',
      },
      fontFamily: {
        display: ['var(--font-anton)', 'Impact', 'sans-serif'],
        heading: ['var(--font-oswald)', 'sans-serif'],
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        hairline: 'rgba(233, 220, 195, 0.14)',
        'hairline-strong': 'rgba(233, 220, 195, 0.28)',
      },
      boxShadow: {
        soft: '0 18px 50px -22px rgba(0, 0, 0, 0.85)',
        card: '0 10px 40px -18px rgba(0, 0, 0, 0.75)',
        glow: '0 0 0 1px rgba(233, 220, 195, 0.18), 0 20px 60px -25px rgba(233, 220, 195, 0.25)',
        plate: 'inset 0 2px 6px rgba(0,0,0,0.55), 0 6px 18px -6px rgba(0,0,0,0.7)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'plate-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ready': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(242, 169, 0, 0.55)' },
          '50%': { boxShadow: '0 0 0 18px rgba(242, 169, 0, 0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-14px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-450px 0' },
          '100%': { backgroundPosition: '450px 0' },
        },
      },
      animation: {
        'plate-spin': 'plate-spin 1.1s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite',
        'fade-up': 'fade-up 0.35s ease-out both',
        'pulse-ready': 'pulse-ready 1.6s ease-out infinite',
        'slide-in': 'slide-in 0.28s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      transitionTimingFunction: {
        lux: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
