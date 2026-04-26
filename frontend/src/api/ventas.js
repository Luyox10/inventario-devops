import { apiFetch } from './http';

export async function registrarVenta(datosVenta, token) {
  return await apiFetch('/ventas', {
    method: 'POST',
    body: datosVenta,
    token: token
  });
}

export async function obtenerProductos(token) {
  return await apiFetch('/productos', {
    method: 'GET',
    token: token
  });
}