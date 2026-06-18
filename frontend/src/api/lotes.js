import { apiFetch } from './http';

export function getLotesByProducto({ token, productoId }) {
  return apiFetch(`/api/lotes/producto/${productoId}`, { token });
}

export function updateLoteExpiry({ token, loteId, expiry_date }) {
  return apiFetch(`/api/lotes/${loteId}`, {
    method: 'PUT',
    token,
    body: { expiry_date: expiry_date || null },
  });
}

export function darDeBajaLote({ token, loteId }) {
  return apiFetch(`/api/lotes/${loteId}`, {
    method: 'DELETE',
    token,
  });
}

export function ajustarLote({ token, loteId, nueva_cantidad, motivo }) {
  return apiFetch(`/api/lotes/${loteId}/ajuste`, {
    method: 'PATCH',
    token,
    body: { nueva_cantidad, motivo: motivo || null },
  });
}
