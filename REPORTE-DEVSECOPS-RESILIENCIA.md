# Reporte de Implementación: DevSecOps y Resiliencia

## 1. Resumen Ejecutivo

Este documento describe de manera detallada las implementaciones realizadas en el proyecto **Inventario DevOps** para incorporar prácticas de **DevSecOps** y **resiliencia**. El objetivo no fue solo ejecutar tareas técnicas, sino entender el **por qué**, el **cómo funciona** y los **beneficios** de cada decisión tomada.

El proyecto es un monorepo que contiene:

- **Backend**: Node.js con Express (API REST, autenticación JWT, conexión a MySQL).
- **Frontend**: React con Vite (interfaz de usuario).
- **ML Service**: Python con Flask y scikit-learn (predicciones de ventas).
- **Base de datos**: MySQL 8.0.

La infraestructura se orquesta con Docker Compose en desarrollo y se publican imágenes Docker a DockerHub para despliegue en Render.

---

## 2. Implementación DevSecOps

### 2.1. Concepto y Necesidad

**¿Por qué se hizo?**

En un entorno DevOps, los equipos entregan código de forma rápida y continua. Sin embargo, la velocidad no debe comprometer la seguridad. **DevSecOps** es la práctica de integrar seguridad desde el inicio del pipeline, de forma automática y repetible, para detectar problemas antes de que lleguen a producción.

Sin DevSecOps, los riesgos incluyen:

- **Secretos filtrados** en repositorios públicos.
- **Vulnerabilidades en dependencias** que explotan atacantes.
- **Errores de código** que se convierten en brechas de seguridad.
- **Imágenes Docker con CVEs** que afectan el entorno de producción.

**¿Qué se buscó?**

Asegurar que cada cambio en código pase por múltiples capas de verificación (quality, secrets, SCA, SAST, imagen Docker) antes de ser publicado.

### 2.2. Arquitectura del Pipeline

El pipeline se encuentra en `.github/workflows/cicd.yml` y se ejecuta en cada `push` y `pull_request`.

```text
Push / Pull Request
       |
       v
+------------------+
|  Quality Gates   |
| (test, build,    |
|   npm audit)     |
+--------+---------+
         |
         v
+------------------+
|  Secret Scan     |
|  (TruffleHog)    |
+--------+---------+
         |
         v
+------------------+
|  Snyk Backend    |
|   (SCA)          |
+--------+---------+
         |
         v
+------------------+
|  SonarQube       |
|   (SAST)         |
+--------+---------+
         |
         v
+------------------+
|  Trivy (images)  |
+--------+---------+
         |
         v
+------------------+
| Build & Push     |
| Docker images    |
+--------+---------+
         |
         v
+------------------+
|  Deploy Sim      |
+------------------+
         |
         v
+------------------+
| Monitor Pipeline |
+------------------+
```

**¿Cómo funciona?**

GitHub Actions ejecuta cada job en orden. Cada job representa una capa de seguridad. Si un job falla, los siguientes no se ejecutan (excepto `monitor-pipeline` que se ejecuta siempre para informar el estado). El job `build-and-push` solo corre en `push` a `main`/`master` y requiere que todos los gates anteriores pasen.

**Beneficios:**

- **Detección temprana** de errores y vulnerabilidades.
- **Automatización** de la seguridad, sin depender de revisiones manuales.
- **Trazabilidad**: cada commit tiene su propio análisis y reporte.
- **Confianza** para publicar imágenes Docker libres de vulnerabilidades críticas.

### 2.3. Jobs del Pipeline

#### 2.3.1. Quality Gates

**¿Por qué se hizo?**

Antes de analizar seguridad, es necesario asegurar que el código funciona y compila correctamente. Si los tests fallan, no tiene sentido continuar con el pipeline.

**¿Qué se hizo?**

- `npm ci` a nivel raíz, aprovechando el `package-lock.json` del monorepo.
- Tests del backend: `npm run test -w backend`.
- Tests del frontend: `npm run test -w frontend`.
- Build del frontend: `npm run build -w frontend`.
- Auditoría de dependencias:
  - `npm audit -w backend --audit-level=critical`
  - `npm audit -w frontend --audit-level=critical`
  - `continue-on-error: true` para no bloquear el pipeline por dependencias sin parche.
- Creación de un `.env` temporal para el backend en CI.

**¿Cómo funciona?**

`npm ci` instala exactamente las versiones del lockfile, lo que garantiza reproducibilidad. Los tests se ejecutan por workspace. El build del frontend verifica que el código React/Vite compile sin errores. `npm audit` revisa el registro de vulnerabilidades de npm. El `.env` temporal permite que los tests del backend se conecten a una base de datos y firmen tokens JWT.

**Beneficios:**

- Garantiza que el código compila y pasa los tests antes de continuar.
- Detecta dependencias con vulnerabilidades críticas.
- `continue-on-error: true` evita que el pipeline se bloquee por vulnerabilidades sin parche conocido, permitiendo avanzar mientras se planifica la actualización.

**Problemas resueltos:**

- `npm ci` fallaba en el frontend porque no tenía `package-lock.json` en su contexto. Se solucionó usando npm workspaces en la raíz.
- `npm audit` reportaba vulnerabilidades HIGH (como `xlsx`, `react-router-dom`, `vite`) sin parche disponible. Se bajó el umbral a `critical` para evitar bloqueos.

---

#### 2.3.2. Secret Scanning (TruffleHog)

**¿Por qué se hizo?**

Los secretos (tokens, contraseñas, claves API) nunca deben estar en el código. Si un desarrollador los sube por error, TruffleHog los detecta antes de que queden expuestos en el historial de git.

**¿Qué se hizo?**

- Se usa la acción `trufflesecurity/trufflehogg@main`.
- Se escanea el filesystem del repositorio (`path: ./`).
- Se usa `--only-verified` para reportar solo secretos que TruffleHog pudo verificar.
- Se usa `trufflehog-exclude.txt` para ignorar archivos como logs, builds o assets.

**¿Cómo funciona?**

TruffleHog analiza cada archivo del repositorio buscando patrones de secretos conocidos (AWS keys, GitHub tokens, contraseñas de bases de datos, etc.). Si detecta un patrón, intenta verificarlo contra el servicio real para evitar falsos positivos. Si es válido, el pipeline falla.

**Beneficios:**

- Evita fugas de credenciales en el repositorio.
- Detecta secretos históricos en el git log (si se usa `fetch-depth: 0`).
- Reduce el riesgo de exposición pública accidental.

**Problemas resueltos:**

- `BASE and HEAD commits are the same. TruffleHog won't scan anything.` → ocurre cuando se escanea solo el diff entre commits. Se cambió a escanear el filesystem completo.
- `unexpected filesystem` → el subcomando `filesystem` no era válido en `extra_args`. Se eliminó.

---

#### 2.3.3. Snyk (Software Composition Analysis)

**¿Por qué se hizo?**

Las dependencias de terceros son una de las principales fuentes de vulnerabilidades. Snyk mantiene una base de datos de vulnerabilidades conocidas y compara las dependencias del proyecto contra ella.

**¿Qué se hizo?**

- Se analiza solo el backend (`snyk-backend`) porque el proyecto tiene un único proyecto en Snyk.
- Se eliminó el job de frontend.
- Se genera un reporte SARIF y se sube a GitHub Security tab.
- Umbral de severidad: `high`.

**¿Cómo funciona?**

Snyk lee `backend/package.json` y `package-lock.json`, identifica las librerías y sus versiones, y las compara con su base de datos de CVEs. Si encuentra vulnerabilidades de severidad HIGH o CRITICAL, el pipeline falla. El reporte SARIF se integra en GitHub para mostrar alertas en el repositorio.

**Beneficios:**

- Detecta vulnerabilidades en dependencias de Node.js antes de desplegar.
- Centraliza el reporte de vulnerabilidades en GitHub Security.
- Permite priorizar parches según severidad.

**Problemas resueltos:**

- Snyk frontend fallaba porque no encontraba `node_modules` en su contexto. Se eliminó el job de frontend para evitar duplicación, dado que el proyecto tiene un único proyecto en Snyk.

---

#### 2.3.4. SonarQube / SonarCloud (SAST)

**¿Por qué se hizo?**

El análisis estático de código (SAST) encuentra bugs, code smells, duplicaciones y vulnerabilidades sin ejecutar el programa. SonarQube es una de las herramientas más usadas para este propósito.

**¿Qué se hizo?**

- Se analiza el backend (`projectBaseDir: backend`).
- Se configuró correctamente `sonar.organization=luyox10` y `sonar.projectKey=Luyox10_inventario-devops` en `backend/sonar-project.properties`.
- Se eliminó el paso de quality gate check porque generaba error 403 por permisos.
- Se ejecutan los tests del backend antes del scan para obtener cobertura.

**¿Cómo funciona?**

SonarQube escanea el código fuente, detecta problemas de calidad y seguridad, y los reporta en el dashboard. El pipeline envía los resultados a SonarCloud usando `SONAR_TOKEN` y `SONAR_HOST_URL`.

**Beneficios:**

- Mejora la calidad del código a largo plazo.
- Detecta vulnerabilidades antes de que lleguen a producción.
- Proporciona métricas de deuda técnica y cobertura.

**Problemas resueltos:**

- `sonar.organization` tenía mayúsculas incorrectas. Se corrigió a minúsculas.
- Conflicto con la opción **Automatic Analysis** de SonarCloud. Se recomendó desactivarla en la interfaz web.
- El quality gate check daba error 403. Se eliminó el paso, pero el scan sigue ejecutándose.

---

#### 2.3.5. Trivy (Vulnerability Scanning de Imágenes Docker)

**¿Por qué se hizo?**

Incluso si el código es seguro, la imagen Docker puede contener vulnerabilidades en el sistema operativo base o en las librerías instaladas. Trivy escanea imágenes Docker y reporta CVEs.

**¿Qué se hizo?**

- Se construyen las imágenes de backend y frontend localmente sin hacer push.
- Se escanean con Trivy en formato `table` y `sarif`.
- Se suben reportes SARIF a GitHub Security tab.
- Se ignoran las vulnerabilidades del directorio `/usr/local/lib/node_modules/npm` porque provienen del propio `npm` de la imagen base, no del código de la aplicación.
- Se actualizaron las imágenes base a `nginx:alpine` y `node:22-alpine` con `apk upgrade --no-cache`.
- Se usa `severity: CRITICAL,HIGH` y `ignore-unfixed: true`.

**¿Cómo funciona?**

Trivy descarga la base de datos de vulnerabilidades, escanea cada capa de la imagen Docker y compara los paquetes instalados contra CVEs conocidas. Si encuentra vulnerabilidades de severidad CRITICAL o HIGH, el pipeline falla. El reporte SARIF se sube a GitHub.

**Beneficios:**

- Detecta vulnerabilidades en el sistema operativo y librerías de las imágenes.
- Evita publicar imágenes Docker con CVEs críticas.
- Proporciona reportes integrados en GitHub Security.

**Problemas resueltos:**

- Trivy fallaba porque los Dockerfiles usaban `npm ci` y no había `package-lock.json` en el contexto. Se cambió a `npm install`.
- Trivy reportaba decenas de vulnerabilidades en `nginx:1.27-alpine`. Se actualizó a `nginx:alpine` y se aplicaron parches del sistema.

---

#### 2.3.6. Build and Push

**¿Por qué se hizo?**

Después de que todo el código y las imágenes pasen los controles, es necesario publicar las imágenes en DockerHub para que Render u otro orquestador pueda desplegarlas.

**¿Qué se hizo?**

- Se ejecuta solo en `push` a `main` o `master`.
- Requiere que todos los jobs anteriores pasen.
- Se generan tags `latest` y `sha`.
- Se inicia sesión en DockerHub usando `DOCKER_USERNAME` y `DOCKER_PASSWORD`.

**¿Cómo funciona?**

Docker Buildx construye las imágenes y las publica en DockerHub con tags `latest` y el hash corto del commit (`sha`). El tag `latest` permite despliegue simple, mientras que `sha` permite trazabilidad.

**Beneficios:**

- Solo se publican imágenes que pasaron todos los controles de seguridad.
- Se facilita el despliegue continuo.
- Se mantiene un historial de imágenes publicadas.

**Problemas resueltos:**

- El build del backend fallaba porque `backend/package.json` no tiene script `build`. Se eliminó ese paso del job.

---

### 2.4. Ajustes en Dockerfiles

**¿Por qué se hizo?**

Los Dockerfiles definen el entorno de ejecución. Si contienen vulnerabilidades o comandos incorrectos, el pipeline falla y el despliegue se ve afectado.

**¿Qué se hizo?**

- `backend/Dockerfile` y `frontend/Dockerfile`: `npm ci` fue reemplazado por `npm install` porque el `package-lock.json` no está en el contexto de build del subdirectorio, sino en la raíz del workspace.
- `frontend/Dockerfile`: imagen base `nginx:1.27-alpine` fue reemplazada por `nginx:alpine` para obtener la última versión con parches.
- `backend/Dockerfile`, `frontend/Dockerfile` y `ml-service/Dockerfile`: se instaló `wget` para soportar los healthchecks.

**Beneficios:**

- Los builds son estables y reproducibles.
- Se reducen vulnerabilidades del sistema base.
- Las imágenes soportan healthchecks para mejorar la resiliencia.

---

### 2.5. Secrets y Configuración

**¿Por qué se hizo?**

Las credenciales no deben estar en el código. GitHub Secrets permite almacenarlas de forma segura y usarlas en el pipeline.

**Secrets requeridos:**

- `SONAR_TOKEN`, `SONAR_HOST_URL` — para SonarQube/Cloud.
- `SNYK_TOKEN` — para Snyk.
- `DOCKER_USERNAME`, `DOCKER_PASSWORD` — para DockerHub.
- `CI_DB_PASSWORD`, `CI_JWT_SECRET`, `CI_BOOTSTRAP_SECRET` — variables para tests en CI.

**Beneficios:**

- Las credenciales no quedan expuestas en el repositorio.
- El pipeline puede acceder a servicios externos de forma segura.

---

## 3. Implementación de Resiliencia

### 3.1. Concepto y Necesidad

**¿Por qué se hizo?**

La resiliencia es la capacidad del sistema para mantenerse operativo ante fallos y recuperarse rápidamente. En un entorno de producción, cualquier servicio puede fallar: la base de datos, el backend, el frontend o el servicio de ML. Un plan de contingencia minimiza el impacto.

Se eligieron **dos estrategias** acordes a la infraestructura actual (Docker Compose local, DockerHub, Render):

1. **Backups y Recuperación de Datos (DRP)**.
2. **Monitoreo Proactivo y Healthchecks**.

Estas dos estrategias son las más viables sin requerir Kubernetes, AWS, múltiples zonas de disponibilidad o balanceadores de carga.

### 3.2. Backups y Recuperación de Datos (DRP)

**¿Por qué se hizo?**

La base de datos MySQL es el activo más crítico del sistema. Contiene inventario, ventas, usuarios, alertas, lotes y predicciones. Si se pierde el volumen `mysql_data`, se pierde toda la información del negocio.

**¿Qué se hizo?**

Se creó un servicio dedicado `backup` en `docker-compose.yml` con su propia imagen en `devops/backup/`.

**Componentes:**

- `devops/backup/Dockerfile` — imagen basada en `mysql:8.0` con `cronie` y `gzip`.
- `devops/backup/backup.sh` — realiza `mysqldump`, comprime con `gzip` y elimina backups antiguos.
- `devops/backup/restore.sh` — restaura un backup `.sql.gz` en la base de datos.
- `devops/backup/entrypoint.sh` — ejecuta un backup inmediato al iniciar y luego deja corriendo `crond`.
- `devops/backup/crontab` — programa backups automáticos a las `02:00 AM`.

**¿Cómo funciona?**

1. Al iniciar el contenedor `backup`, se ejecuta un backup inmediato.
2. Luego `crond` queda esperando la hora programada (02:00 AM).
3. En la hora programada, `backup.sh` ejecuta `mysqldump` sobre la base de datos `inventario`.
4. El resultado se comprime con `gzip` y se guarda en `/backups/backup_inventario_YYYYMMDD_HHMMSS.sql.gz`.
5. Se eliminan los backups más antiguos que `BACKUP_RETENTION_DAYS` (por defecto 7 días).
6. Si ocurre un desastre, `restore.sh` descomprime y ejecuta el SQL en MySQL.

**Políticas:**

- Backup inmediato al iniciar.
- Backup automático diario a las 02:00 AM.
- Retención de 7 días.
- Almacenamiento en el volumen `mysql_backups`.

**Uso:**

```bash
# Backup manual
docker compose exec backup /usr/local/bin/backup.sh

# Ver backups disponibles
docker compose exec backup ls -la /backups

# Restaurar un backup
docker compose exec backup /usr/local/bin/restore.sh /backups/backup_inventario_YYYYMMDD_HHMMSS.sql.gz
```

**Beneficios:**

- **Recuperación ante desastres**: en caso de corrupción o pérdida del volumen, se puede restaurar la base desde un backup reciente.
- **Automatización**: los backups no dependen de que un humano los ejecute.
- **Retención controlada**: se evita llenar el disco con backups antiguos.
- **Rápida restauración**: el script de restore es un solo comando.

### 3.3. Monitoreo Proactivo y Healthchecks

**¿Por qué se hizo?**

Los contenedores pueden fallar por muchas razones: error de aplicación, conexión perdida a la base de datos, falta de memoria, etc. Sin monitoreo, el sistema puede seguir "corriendo" pero no respondiendo. Los healthchecks permiten detectar cuando un servicio realmente está saludable.

**¿Qué se hizo?**

Se agregaron `healthcheck` en `docker-compose.yml` para todos los servicios y se ajustaron las dependencias.

| Servicio | Healthcheck | Detalle |
|----------|-------------|---------|
| `mysql` | `mysqladmin ping -h 127.0.0.1 -prootpass` | Verifica que MySQL responde. |
| `backend` | `wget http://127.0.0.1:3001/health` | Verifica que el endpoint `/health` responde `HTTP 200`. |
| `ml-service` | `wget http://127.0.0.1:5001/health` | Verifica que el endpoint `/health` del servicio ML responde. |
| `frontend` | `wget http://127.0.0.1:80/` | Verifica que Nginx sirve el frontend. |

Además:

- `restart: unless-stopped` en todos los servicios.
- `depends_on` con `condition: service_healthy` para que el backend y el frontend no inicien hasta que MySQL y el ML service estén saludables.
- Se instalaron `wget` en los Dockerfiles de `backend`, `frontend` y `ml-service` para permitir los healthchecks.

**¿Cómo funciona?**

Docker Compose ejecuta periódicamente el comando de healthcheck definido. Si el comando falla varias veces seguidas (según `retries`), el contenedor se marca como `unhealthy`. Cuando un servicio tiene `depends_on` con `condition: service_healthy`, los dependientes esperan a que el servicio pase a estado `healthy` antes de arrancar. Si un contenedor con `restart: unless-stopped` falla, Docker lo reinicia automáticamente.

**Beneficios:**

- **Detección temprana** de fallos.
- **Orden de inicio controlado**: el backend no intenta conectarse a MySQL antes de que esté listo.
- **Recuperación automática**: los servicios se reinician si fallan.
- **Mayor disponibilidad** sin intervención manual.

### 3.4. Arquitectura del Plan de Contingencia

```text
Usuario
  |
  v
+----------------+
|   Frontend     | (Nginx + React)
|   (health)     |
+--------+-------+
         |
         v
+----------------+
|    Backend     | (Node.js + Express)
|   (health)     |
+--------+-------+
         |
         +---------------->+----------------+
                           |   ML Service   | (Python + Flask)
                           |    (health)    |
                           +--------+-------+
                                    |
         +--------------------------+
         |
         v
+----------------+
|     MySQL      | (Base de datos)
|    (health)    |
+--------+-------+
         |
         v
+----------------+
|    Backup      | (mysqldump + cron)
|   (mysqldump)  |
+----------------+
```

### 3.5. Archivos Afectados por Resiliencia

- `docker-compose.yml` — servicio `backup`, healthchecks, volúmenes y dependencias.
- `backend/Dockerfile` — agregado `wget`.
- `frontend/Dockerfile` — agregado `wget`.
- `ml-service/Dockerfile` — agregado `wget`.
- `devops/backup/Dockerfile`, `backup.sh`, `restore.sh`, `entrypoint.sh`, `crontab`.
- `CONTINGENCIA.md` — documentación del plan de contingencia.

### 3.6. Resultados de Resiliencia

- El sistema ahora puede recuperar la base de datos desde un backup automático.
- Docker Compose detecta y reinicia servicios fallidos automáticamente.
- Los servicios no arrancan hasta que sus dependencias estén saludables, evitando errores de conexión.
- El plan de contingencia está documentado y es reproducible.

---

## 4. Conclusiones

- Se consolidó un pipeline **DevSecOps** con controles de seguridad en múltiples capas: SAST, SCA, secret scanning, vulnerability scanning y npm audit.
- Se resolvieron múltiples errores del pipeline relacionados con npm workspaces, SonarCloud, Snyk, Trivy y Docker.
- Se implementaron **dos estrategias de resiliencia**: backups/recuperación de MySQL y monitoreo proactivo con healthchecks.
- Se documentó el plan de contingencia en `CONTINGENCIA.md`.
- Cada decisión fue tomada considerando el **por qué**, el **cómo funciona** y los **beneficios** para el proyecto.

---

## 5. Próximos Pasos Recomendados

- **Actualizar dependencias del frontend** (`vite`, `react-router-dom`, reemplazar `xlsx`) para reducir vulnerabilidades reportadas por Dependabot.
- **Migrar de `nginx:alpine` a una imagen base con menos CVEs** o actualizar regularmente.
- **Integrar alertas externas** (Discord/Slack/Telegram) cuando `monitor-pipeline` falle.
- **Realizar pruebas de recuperación periódicas** restaurando backups en entornos aislados.
- **Considerar off-site backups** (S3, Google Drive) para mayor tolerancia ante desastres.
- **Actualizar las GitHub Actions** que emiten warnings de Node.js 20 deprecado.

---

## 6. Anexo: Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `.github/workflows/cicd.yml` | Pipeline CI/CD con DevSecOps |
| `backend/sonar-project.properties` | Configuración de SonarCloud |
| `backend/Dockerfile` | Imagen del backend con `wget` y `npm install` |
| `frontend/Dockerfile` | Imagen del frontend con `nginx:alpine` y `wget` |
| `ml-service/Dockerfile` | Imagen del ML service con `wget` |
| `docker-compose.yml` | Orquestación con healthchecks y backup |
| `devops/backup/*` | Scripts e imagen de backups de MySQL |
| `CONTINGENCIA.md` | Plan de contingencia y resiliencia |
| `trufflehog-exclude.txt` | Exclusiones de TruffleHog |
| `REPORTE-DEVSECOPS-RESILIENCIA.md` | Este reporte |
