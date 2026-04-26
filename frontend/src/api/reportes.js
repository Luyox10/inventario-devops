import { apiFetch } from './http';

export function getDashboard({ token }) {
  return apiFetch('/api/reportes/dashboard', { token });
}
