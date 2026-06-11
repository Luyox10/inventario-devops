import { apiFetch } from './http';

export function updateStockMovimiento({ token, productoId, tipo, cantidad, motivo, expiry_date }) {
  return apiFetch(`/api/stock/${productoId}`, {
    method: 'PUT',
    token,
    body: {
      tipo,
      cantidad,
      motivo,
      expiry_date,
    },
  });
}

export function setStockActual({ token, productoId, stock_actual, motivo }) {
  return apiFetch(`/api/stock/${productoId}`, {
    method: 'PUT',
    token,
    body: {
      stock_actual,
      motivo,
    },
  });
}

export function updateStockMinimo({ token, productoId, stock_minimo }) {
  return apiFetch(`/api/stock/${productoId}/minimo`, {
    method: 'PUT',
    token,
    body: { stock_minimo },
  });
}
