#!/bin/bash
set -euo pipefail

# Variables de conexion a MySQL
DB_HOST=${MYSQL_HOST:-mysql}
DB_PORT=${MYSQL_PORT:-3306}
DB_USER=${MYSQL_USER:-root}
DB_PASSWORD=${MYSQL_PASSWORD:-rootpass}
DB_NAME=${MYSQL_DATABASE:-inventario}
BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Fecha y hora para el nombre del backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Iniciando backup de ${DB_NAME}..."
mkdir -p "${BACKUP_DIR}"

# Realizar el backup y comprimirlo
mysqldump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --password="${DB_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  "${DB_NAME}" | gzip > "${BACKUP_FILE}"

echo "[$(date)] Backup completado: ${BACKUP_FILE}"

# Eliminar backups antiguos segun la politica de retencion
find "${BACKUP_DIR}" -type f -name "backup_${DB_NAME}_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date)] Limpieza de backups mayores a ${RETENTION_DAYS} dias completada."
