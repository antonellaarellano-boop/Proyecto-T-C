/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
    // Router Cache del cliente: no cachear páginas dinámicas al navegar, así
    // los datos (ej. lista de colaboradores en Eventos) siempre se re-piden
    // frescos al cambiar de sección. Sin esto, Next servía RSC cacheado y la
    // lista quedaba desactualizada tras crear/editar en Colaboradores.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.airtableusercontent.com' },
      { protocol: 'https', hostname: 'dl.airtable.com' },
    ],
  },
  // En dev (Windows) la caché de webpack en disco a veces se corrompe
  // (errores "Cannot read properties of undefined (reading 'call')" y
  // fallos de rename de .pack.gz). La desactivamos en desarrollo para estabilidad.
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
