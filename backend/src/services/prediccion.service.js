const { pool } = require('../config/db');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

async function fetchML(path, body, method = 'POST') {
  const options = {
    method,
    signal: AbortSignal.timeout(60000),
  };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${ML_URL}${path}`, options);
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.error || 'ML service error'), { status: res.status });
  return json;
}

async function getHistorialVentas() {
  const [rows] = await pool.query(
    `SELECT
       DATE(v.created_at)        AS fecha,
       dv.producto_id,
       p.nombre                  AS nombre_producto,
       COALESCE(p.categoria, 'Sin categoria') AS categoria,
       SUM(dv.cantidad)          AS cantidad,
       dv.precio_unitario        AS precio,
       p.stock_actual,
       p.stock_minimo,
       p.unidad
     FROM detalle_ventas dv
     JOIN ventas v   ON v.id  = dv.venta_id
     JOIN productos p ON p.id = dv.producto_id
     GROUP BY DATE(v.created_at), dv.producto_id, dv.precio_unitario
     ORDER BY fecha ASC`
  );
  return rows;
}

async function getProductosActivos() {
  const [rows] = await pool.query(
    `SELECT
       id AS producto_id,
       nombre,
       COALESCE(categoria, 'Sin categoria') AS categoria,
       precio,
       stock_actual,
       stock_minimo,
       unidad
     FROM productos
     WHERE activo = 1
     ORDER BY nombre ASC`
  );
  return rows;
}

async function trainModelo() {
  const ventas = await getHistorialVentas();
  return fetchML('/train', { ventas });
}

async function simulateAndTrain({ dias = 90 } = {}) {
  const productos = await getProductosActivos();
  if (!productos.length) {
    throw Object.assign(new Error('No hay productos activos para simular datos.'), { status: 400 });
  }
  const simResult = await fetchML('/simulate', { productos, dias });
  const trainResult = await fetchML('/train', { ventas: simResult.ventas });
  return {
    simulacion: {
      registros: simResult.total_registros,
      productos: simResult.productos,
      dias: simResult.dias,
    },
    entrenamiento: trainResult,
  };
}

async function getPredictiones({ dias = 7 } = {}) {
  const productos = await getProductosActivos();
  return fetchML('/predict', { productos, dias });
}

async function getMLHealth() {
  const res = await fetch(`${ML_URL}/health`, {
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}

async function getMetrics() {
  return fetchML('/metrics', undefined, 'GET');
}

module.exports = { trainModelo, simulateAndTrain, getPredictiones, getMLHealth, getMetrics };
