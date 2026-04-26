import { apiFetch } from './http';

export function listProductos({ token }) {
  return apiFetch('/api/productos', { token });
}

export function createProducto({ token, data }) {
  return apiFetch('/api/productos', { method: 'POST', token, body: data });
}

export function updateProducto({ token, id, data }) {
  return apiFetch(`/api/productos/${id}`, { method: 'PUT', token, body: data });
}

export function deleteProducto({ token, id }) {
  return apiFetch(`/api/productos/${id}`, { method: 'DELETE', token });
}
