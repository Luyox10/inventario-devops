import { apiFetch } from './http';

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
