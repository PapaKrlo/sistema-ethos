# Sincronización Programada de Correos

Este endpoint permite la sincronización automática diaria de correos utilizando Vercel Cron Jobs.

## Configuración

La sincronización está configurada para ejecutarse automáticamente todos los días a las 2:00 AM según la configuración en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-emails",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## Limitaciones del Plan Gratuito de Vercel

El plan gratuito de Vercel limita los cron jobs a **60 segundos** de ejecución. Por este motivo, el endpoint está diseñado para iniciar la sincronización y retornar inmediatamente, mientras el proceso continúa en segundo plano.

## Funcionamiento

1. Verifica la autorización mediante el token secreto.
2. Comprueba si ya hay una sincronización en progreso para evitar trabajos duplicados.
3. Inicia el proceso de sincronización pero NO espera a que termine.
4. Retorna inmediatamente para evitar superar el límite de 60 segundos.
5. La sincronización continúa ejecutándose en segundo plano.

## Pruebas manuales

Para probar manualmente la sincronización, podemos hacer una solicitud HTTP GET al endpoint con la autorización adecuada:

```bash
curl -X GET https://tu-dominio.vercel.app/api/cron/sync-emails \
  -H "Authorization: Bearer nuestro-cron-secret"
```

## Variables de entorno requeridas

- `CRON_SECRET`: Token secreto para autorizar la ejecución del cron job.

## Logs

Todos los logs de la sincronización se almacenan en la caché y pueden verse en la consola de Vercel. El proceso completo de sincronización puede tardar varios minutos, pero el cron job solo se ejecuta durante los primeros segundos para iniciar el proceso. 