#!/usr/bin/env node

/**
 * Script para verificar la configuración del sistema
 * Comprueba que las variables de entorno necesarias estén configuradas
 */

// Carga variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

// Definir colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.cyan}======================================${colors.reset}`);
console.log(`${colors.cyan}     VERIFICACIÓN DE CONFIGURACIÓN${colors.reset}`);
console.log(`${colors.cyan}======================================${colors.reset}`);

// Función para verificar una variable de entorno
function checkEnvVar(name, description) {
  const value = process.env[name];
  
  if (!value) {
    console.log(`${colors.red}❌ ${colors.white}${name}${colors.reset}: ${colors.yellow}No configurado${colors.reset} - ${description}`);
    return false;
  } else {
    const maskedValue = name.includes('PASSWORD') || name.includes('SECRET') || name.includes('TOKEN') 
      ? '********' 
      : value.length > 20 ? value.substring(0, 10) + '...' : value;
    console.log(`${colors.green}✅ ${colors.white}${name}${colors.reset}: ${colors.green}Configurado${colors.reset} (${maskedValue})`);
    return true;
  }
}

console.log(`\n${colors.magenta}Configuración IMAP:${colors.reset}`);
const imapConfigured = [
  checkEnvVar('EMAIL_USER', 'Usuario de correo para IMAP'),
  checkEnvVar('EMAIL_PASSWORD', 'Contraseña de correo para IMAP'),
  checkEnvVar('EMAIL_HOST', 'Host del servidor IMAP'),
  process.env.EMAIL_PORT ? 
    checkEnvVar('EMAIL_PORT', 'Puerto del servidor IMAP') : 
    (console.log(`${colors.yellow}⚠️ ${colors.white}EMAIL_PORT${colors.reset}: ${colors.yellow}Recomendado añadir${colors.reset} - Puerto del servidor IMAP (típicamente 993)`), true)
].every(Boolean);

console.log(`\n${colors.magenta}Configuración UploadThing:${colors.reset}`);
let uploadThingConfigured = false;
if (process.env.UPLOADTHING_TOKEN) {
  console.log(`${colors.green}✅ ${colors.white}UPLOADTHING_TOKEN${colors.reset}: ${colors.green}Configurado${colors.reset} (********)`);
  console.log(`${colors.yellow}ℹ️ ${colors.reset}Usando UPLOADTHING_TOKEN en lugar de UPLOADTHING_SECRET y UPLOADTHING_APP_ID`);
  uploadThingConfigured = true;
} else {
  uploadThingConfigured = [
    checkEnvVar('UPLOADTHING_SECRET', 'Secret para UploadThing'),
    checkEnvVar('UPLOADTHING_APP_ID', 'ID de la aplicación en UploadThing')
  ].every(Boolean);
}

console.log(`\n${colors.magenta}Configuración Strapi:${colors.reset}`);
const graphqlUrl = process.env.NEXT_PUBLIC_STRAPI_GRAPHQL_URL || process.env.NEXT_PUBLIC_GRAPHQL_URL;
let graphqlConfigured = false;
if (graphqlUrl) {
  console.log(`${colors.green}✅ ${colors.white}URL de GraphQL${colors.reset}: ${colors.green}Configurado${colors.reset} (${graphqlUrl.substring(0, 20)}...)`);
  graphqlConfigured = true;
} else {
  console.log(`${colors.red}❌ ${colors.white}URL de GraphQL${colors.reset}: ${colors.yellow}No configurado${colors.reset} - URL del endpoint GraphQL de Strapi`);
  graphqlConfigured = false;
}

const strapiConfigured = [
  graphqlConfigured,
  checkEnvVar('STRAPI_API_TOKEN', 'Token de API de Strapi')
].every(Boolean);

console.log(`\n${colors.magenta}Configuración Cron:${colors.reset}`);
let cronConfigured = false;
if (process.env.CRON_SECRET) {
  cronConfigured = checkEnvVar('CRON_SECRET', 'Secreto para proteger los endpoints de cron');
} else {
  console.log(`${colors.yellow}⚠️ ${colors.white}CRON_SECRET${colors.reset}: ${colors.yellow}Recomendado añadir${colors.reset} - Protege los endpoints de cron`);
  cronConfigured = true; // No es obligatorio para desarrollo local
}

console.log(`\n${colors.cyan}======================================${colors.reset}`);
console.log(`${colors.cyan}     RESUMEN DE CONFIGURACIÓN${colors.reset}`);
console.log(`${colors.cyan}======================================${colors.reset}`);

console.log(`${imapConfigured ? colors.green : colors.red}IMAP: ${imapConfigured ? '✅ Configurado' : '❌ Incompleto'}${colors.reset}`);
console.log(`${uploadThingConfigured ? colors.green : colors.red}UploadThing: ${uploadThingConfigured ? '✅ Configurado' : '❌ Incompleto'}${colors.reset}`);
console.log(`${strapiConfigured ? colors.green : colors.red}Strapi: ${strapiConfigured ? '✅ Configurado' : '❌ Incompleto'}${colors.reset}`);
console.log(`${cronConfigured ? colors.green : colors.red}Cron: ${cronConfigured ? '✅ Configurado' : '❌ No configurado'}${colors.reset}`);

console.log(`\n${colors.cyan}======================================${colors.reset}`);
if (imapConfigured && uploadThingConfigured && strapiConfigured && cronConfigured) {
  console.log(`${colors.green}¡Configuración completa! El sistema está listo.${colors.reset}`);
} else {
  console.log(`${colors.yellow}⚠️ Configuración incompleta. Revisa las variables faltantes.${colors.reset}`);
}
console.log(`${colors.cyan}======================================${colors.reset}`); 