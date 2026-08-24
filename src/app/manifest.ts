import type { MetadataRoute } from 'next';

/**
 * Manifesto PWA — é isso que permite "Adicionar à tela inicial" abrir em
 * modo standalone (sem barra de endereço) no Android e no iOS, em vez de
 * um simples atalho de favorito.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SIX Wowness Club',
    short_name: 'SIX Bar',
    description: 'Cardápio e pedidos do bar da SIX Sport Life.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0B0A',
    theme_color: '#0B0B0A',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
