import { apiFetch } from './http';

export function getKardex({ token, productoId, desde, hasta }) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const qs = params.toString();
  return apiFetch(`/api/kardex/${productoId}${qs ? `?${qs}` : ''}`, { token });
}
