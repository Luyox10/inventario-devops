#!/bin/bash
set -euo pipefail

# Script para restaurar un backup de MySQL
# Uso: restore.sh <ruta-al-backup.sql.gz>

DB_HOST=${MYSQL_HOST:-mysql}
DB_PORT=${MYSQL_PORT:-3306}
DB_USER=${MYSQL_USER:-root}
DB_PASSWORD=${MYSQL_PASSWORD:-rootpass}
DB_NAME=${MYSQL_DATABASE:-inventario}

if [ $# -lt 1 ]; then
  echo "Uso: $0 <ruta-al-backup.sql.gz>"
  echo "Ejemplo: $0 /backups/backup_inventario_20260715_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: No se encontro el archivo ${BACKUP_FILE}"
  exit 1
fi

echo "[$(date)] Restaurando backup ${BACKUP_FILE} en ${DB_NAME}..."

# Descomprimir y restaurar
gunzip < "${BACKUP_FILE}" | mysql \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --password="${DB_PASSWORD}" \
  "${DB_NAME}"

echo "[$(date)] Restauracion completada."
