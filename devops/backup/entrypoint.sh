#!/bin/bash
set -euo pipefail

# Punto de entrada del contenedor de backups
# Ejecuta un backup inmediato y luego deja corriendo cron para backups programados

echo "[$(date)] Contenedor de backups iniciado."

# Realizar un backup inicial al arrancar el contenedor
/usr/local/bin/backup.sh

# Iniciar cron en primer plano para ejecutar backups programados
exec cron -f
