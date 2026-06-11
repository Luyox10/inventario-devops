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

  const [[expiringProductos]] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS proximos_a_vencer
     FROM productos p
     LEFT JOIN lotes l ON l.producto_id = p.id AND l.activo = 1
     WHERE p.activo = 1
       AND (COALESCE(MIN(l.expiry_date), p.expiry_date) IS NOT NULL
            AND COALESCE(MIN(l.expiry_date), p.expiry_date) <= DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
            AND COALESCE(MIN(l.expiry_date), p.expiry_date) >= CURRENT_DATE())`
  );

  const [[expiredProductos]] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS vencidos
     FROM productos p
     LEFT JOIN lotes l ON l.producto_id = p.id AND l.activo = 1
     WHERE p.activo = 1
       AND (COALESCE(MIN(l.expiry_date), p.expiry_date) IS NOT NULL
            AND COALESCE(MIN(l.expiry_date), p.expiry_date) < CURRENT_DATE())`
  );

  return {
    total_ventas_hoy: Number(ventasHoy.total_ventas_hoy || 0),
    productos_activos: Number(productosActivos.productos_activos || 0),
    stock_bajo: Number(alertasStockBajo.stock_bajo || 0),
    proximos_a_vencer: Number(expiringProductos.proximos_a_vencer || 0),
    vencidos: Number(expiredProductos.vencidos || 0),
  };
}

module.exports = { dashboard };
