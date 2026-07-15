FROM mysql:8.0

# Instalar cronie y gzip (Oracle Linux usa microdnf)
RUN microdnf install -y cronie gzip && \
    microdnf clean all

WORKDIR /backup

COPY backup.sh /usr/local/bin/backup.sh
COPY restore.sh /usr/local/bin/restore.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY crontab /etc/cron.d/backup-cron

RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh && \
    chmod 0644 /etc/cron.d/backup-cron && \
    crontab /etc/cron.d/backup-cron && \
    mkdir -p /backups

VOLUME ["/backups"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
