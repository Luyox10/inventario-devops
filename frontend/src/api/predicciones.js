import { apiFetch } from './http';

export function getMLHealth({ token }) {
  return apiFetch('/api/predicciones/health', { token });
}

export function trainModelo({ token }) {
  return apiFetch('/api/predicciones/train', { token, method: 'POST' });
}

export function simulateAndTrain({ token, dias = 90 }) {
  return apiFetch(`/api/predicciones/simulate?dias=${dias}`, { token, method: 'POST' });
}

export function getPredictiones({ token, dias = 7 }) {
  return apiFetch(`/api/predicciones/predict?dias=${dias}`, { token });
}

export function getMetrics({ token }) {
  return apiFetch('/api/predicciones/metrics', { token });
}
