# Frontend - Inventario (Vite + React)

## Configuración

1. Copia `.env.example` a `.env` (opcional)

- Si tu backend corre en `http://localhost:3001`, no necesitas cambiar nada.

Variable:

- `VITE_API_URL` (base URL del backend)

## Ejecutar

En la carpeta `frontend/`:

- `npm install`
- `npm run dev`

Luego abre:

- http://localhost:5173

## Login

Usa los usuarios de prueba:

- `admin@inventario.com` / `123456`
- `empleado@inventario.com` / `123456`

## Rutas

- `/login`
- `/admin/dashboard` (solo ADMIN)
- `/empleado/dashboard` (solo EMPLEADO)
