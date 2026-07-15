# Plan de Contingencia y Resiliencia

Este documento describe las estrategias implementadas para garantizar la resiliencia del sistema ante fallos y desastres.

## 1. Backups y Recuperación de Datos (DRP)

### Objetivo

Garantizar la disponibilidad y recuperación de la base de datos MySQL ante fallos, corrupciones o pérdida de datos.

### Qué se implementó

- **Contenedor de backup automático** (`devops/backup/`):
  - Se construye una imagen con `mysqldump`, `cron` y `gzip`.
  - Realiza un backup inicial al arrancar y luego uno programado todos los días a las `02:00 AM`.
  - Los backups se almacenan en el volumen `mysql_backups` y se nombran con fecha/hora.
  - Política de retención de 7 días (`BACKUP_RETENTION_DAYS=7`).

### Cómo usar

- **Realizar backup manual:**

  ```bash
  docker compose exec backup /usr/local/bin/backup.sh
  ```

- **Restaurar un backup:**

  ```bash
  docker compose exec backup /usr/local/bin/restore.sh /backups/backup_inventario_YYYYMMDD_HHMMSS.sql.gz
  ```

- **Ver backups disponibles:**

  ```bash
  docker compose exec backup ls -la /backups
  ```

### Archivos relacionados

- `devops/backup/Dockerfile`
- `devops/backup/backup.sh`
- `devops/backup/restore.sh`
- `devops/backup/crontab`
- `devops/backup/entrypoint.sh`

## 2. Monitoreo Proactivo y Healthchecks

### Objetivo

Detectar fallos en los servicios lo antes posible y permitir que Docker Compose los reinicie automáticamente.

### Qué se implementó

- **Healthchecks en todos los servicios** del `docker-compose.yml`:
  - `mysql`: verifica que el servidor responda a `mysqladmin ping`.
  - `backend`: verifica que el endpoint `/health` responda con `HTTP 200`.
  - `ml-service`: verifica que el endpoint `/health` responda con `HTTP 200`.
  - `frontend`: verifica que el servidor nginx responda en el puerto `80`.
- **Política de reinicio** (`restart: unless-stopped`) en todos los contenedores.
- **Dependencias condicionadas**: servicios como `backend` y `backup` no inician hasta que `mysql` esté saludable.

### Cómo verificar el estado

```bash
docker compose ps
docker compose logs --tail=100 <servicio>
```

## 3. Arquitectura del Plan de Contingencia

```text
Usuario
  |
  v
Frontend (Nginx) ----> Backend (Node.js) ----> MySQL (base de datos)
                             |
                             v
                       ML Service (Python)
                             |
                             v
                       Backup (MySQL dumps + cron)
```

## 4. Próximos Pasos Recomendados

- **Alertas externas**: integrar un webhook (Discord/Slack/Telegram) en GitHub Actions para notificar cuando `monitor-pipeline` falle.
- **Pruebas de recuperación**: ejecutar periódicamente un restore en un entorno aparte para validar los backups.
- **Off-site backups**: subir copias de seguridad a un servicio de almacenamiento externo como S3, Google Drive o similar.
