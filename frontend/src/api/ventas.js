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

export function crearVenta({ token, items }) {
  return apiFetch('/api/ventas', {
    method: 'POST',
    token,
    body: { items },
  });
}

export function listVentas({ token, from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return apiFetch(`/api/ventas${qs ? `?${qs}` : ''}`, { token });
}
