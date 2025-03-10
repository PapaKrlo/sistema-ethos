/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
      },
      {
        protocol: process.env.NEXT_PUBLIC_STRAPI_API_PROTOCOL || 'http',
        hostname: process.env.NEXT_PUBLIC_STRAPI_API_HOST || 'localhost',
        port: process.env.NEXT_PUBLIC_STRAPI_API_PORT || '1337',
      },
      {
        protocol: 'https',
        hostname: '23icj07n4s.ufs.sh',
      },
      {
        protocol: 'https',
        hostname: 'utfs.io',
      }
    ],
  },
  eslint: {
    // Desactiva ESLint durante el build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporalmente ignoramos los errores de tipos para poder desplegar
    // TODO: Encontrar una solución definitiva para el error de tipos en layout.tsx
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig 