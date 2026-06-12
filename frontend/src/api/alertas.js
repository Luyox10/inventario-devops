import { apiFetch } from './http';

export function listStockBajo({ token }) {
  return apiFetch('/api/alertas/stock-bajo', { token });
}

export function listProductosVencidos({ token }) {
  return apiFetch('/api/alertas/vencidos', { token });
}
