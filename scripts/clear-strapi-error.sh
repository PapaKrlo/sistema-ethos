#!/bin/bash

# Script para limpiar la marca de error de Strapi en Redis
# Necesita tener instalado el cliente de Redis CLI

# Lee las variables de entorno
source .env

# Verifica si tenemos las variables necesarias
if [ -z "$UPSTASH_REDIS_REST_URL" ] || [ -z "$UPSTASH_REDIS_REST_TOKEN" ]; then
  echo "Error: Variables de entorno UPSTASH_REDIS_REST_URL o UPSTASH_REDIS_REST_TOKEN no están definidas"
  exit 1
fi

# Función para limpiar una clave en Redis usando la API REST de Upstash
clear_key() {
  local key=$1
  echo "Limpiando clave: $key"
  
  # Usar curl para eliminar la clave vía la API REST de Upstash
  response=$(curl -s -X POST \
    -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
    "$UPSTASH_REDIS_REST_URL/del/$key")
  
  if [[ $response == *"result"* ]]; then
    echo "✅ Clave eliminada exitosamente"
  else
    echo "❌ Error al eliminar la clave: $response"
  fi
}

# Limpiar la marca de error de Strapi
clear_key "strapi_query_error"

# Limpiar la marca de sincronización en progreso
clear_key "sync_in_progress"

echo "Proceso completado." 