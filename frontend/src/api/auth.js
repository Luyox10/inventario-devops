import { apiFetch } from './http';

export function loginRequest({ email, password }) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}
