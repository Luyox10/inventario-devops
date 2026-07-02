import { apiFetch } from './http';

export function getMLHealth({ token }) {
  return apiFetch('/api/predicciones/health', { token });
}

export function getPredictiones({ token, dias = 7 }) {
  return apiFetch(`/api/predicciones/predict?dias=${dias}`, { token });
}
