# inventario-devops

Sistema de gestion de inventarios con backend en Node.js/Express, frontend en React (Vite) y base de datos TiDB.

## Levantar todo con Docker (backend + frontend + db)

Requisitos:

- Docker Desktop instalado
- Puertos libres: `3307`, `3001`, `8080`

Desde la raiz del proyecto:

```bash
docker compose -f devops/docker/docker-compose.yml up --build -d
```

Servicios:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3001`
- Health API: `http://localhost:3001/health`
- MySQL: `localhost:3307`

Usuarios de prueba:

- `admin@inventario.com` / `123456`
- `empleado@inventario.com` / `123456`

Detener contenedores:

```bash
docker compose -f devops/docker/docker-compose.yml down
```

Detener y borrar volumen de datos MySQL:

```bash
docker compose -f devops/docker/docker-compose.yml down -v
```
