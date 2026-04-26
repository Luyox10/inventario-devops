import { apiFetch } from './http';

export function listUsuarios({ token }) {
  return apiFetch('/api/usuarios', { token });
}

export function createUsuario({ token, data }) {
  return apiFetch('/api/usuarios', { method: 'POST', token, body: data });
}

export function updateUsuario({ token, id, data }) {
  return apiFetch(`/api/usuarios/${id}`, { method: 'PUT', token, body: data });
}
