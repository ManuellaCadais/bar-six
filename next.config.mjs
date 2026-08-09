/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Fotos dos itens podem vir do Storage do Supabase ou de URLs externas.
    // Ajuste os domínios conforme onde você hospeda as imagens do cardápio.
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
};

export default nextConfig;
