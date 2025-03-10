# Sistema Ethos - Gestión de Correos

Este proyecto es una aplicación de gestión de correos electrónicos construida con Next.js, que utiliza Redis para caché y colas de procesamiento asíncrono.

## Tecnologías Utilizadas

- **Next.js con App Router**: Framework de React para el frontend y API routes
- **UploadThing**: Servicio para manejo de archivos adjuntos
- **Strapi**: CMS headless para almacenamiento de datos
- **Postgres**: Base de datos relacional
- **Upstash Redis**: Caché y colas de procesamiento asíncrono
- **Vercel Cron Jobs**: Sincronización periódica de correos

## Configuración del Entorno

1. Clona este repositorio
2. Instala las dependencias:

```bash
npm install
```

3. Configura las variables de entorno en un archivo `.env.local`:

```
# Configuración de Redis
UPSTASH_REDIS_REST_URL=tu_url_de_redis
UPSTASH_REDIS_REST_TOKEN=tu_token_de_redis

# Configuración de Email
EMAIL_USER=tu_usuario_de_email
EMAIL_PASSWORD=tu_contraseña_de_email
EMAIL_HOST=tu_host_de_email
EMAIL_PORT=993

# Configuración de Cron
CRON_SECRET=tu_clave_secreta_para_cron_jobs
```

## Desarrollo Local

```bash
npm run dev
```

## Estructura del Proyecto

- `app/lib/`: Bibliotecas y utilidades
  - `cache.ts`: Funciones para caché con Redis
  - `queue.ts`: Configuración de colas de procesamiento
  - `email.ts`: Servicio de manejo de correos

- `app/api/`: Endpoints de API
  - `emails/`: Endpoints para manejo de correos
  - `cron/`: Endpoints para tareas programadas

## Características Principales

- **Caché de Metadatos**: Almacenamiento en caché de metadatos de correos para mejorar el rendimiento
- **Procesamiento Asíncrono**: Colas para procesar correos y adjuntos en segundo plano
- **Sincronización Periódica**: Actualización automática de correos mediante Vercel Cron Jobs

## Despliegue

La aplicación está configurada para desplegarse en Vercel, con soporte para Cron Jobs para la sincronización periódica de correos.

```bash
vercel
```

## Licencia

Este proyecto es privado y no está disponible para uso público sin autorización.
