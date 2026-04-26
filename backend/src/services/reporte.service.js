const { pool } = require('../config/db');

async function dashboard() {
  const [[ventasHoy]] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS total_ventas_hoy
     FROM ventas
     WHERE DATE(created_at) = CURDATE()`
  );

  const [[productosActivos]] = await pool.query(
    `SELECT COUNT(*) AS productos_activos
     FROM productos
     WHERE activo = 1`
  );

  const [[alertasStockBajo]] = await pool.query(
    `SELECT COUNT(*) AS stock_bajo
     FROM productos
     WHERE activo = 1 AND stock_actual <= stock_minimo`
  );

  return {
    total_ventas_hoy: Number(ventasHoy.total_ventas_hoy || 0),
    productos_activos: Number(productosActivos.productos_activos || 0),
    stock_bajo: Number(alertasStockBajo.stock_bajo || 0),
  };
}

module.exports = { dashboard };
