const { pool } = require('../config/db');

async function listStockBajo() {
  const threshold = Number(process.env.EXPIRY_THRESHOLD_DAYS) || 7;
  // Return products that are low on stock OR are expiring within threshold (or already expired)
  const sql = `SELECT id, nombre, sku, precio, stock_actual, stock_minimo, expiry_date,
    DATEDIFF(expiry_date, CURRENT_DATE()) AS days_to_expire,
    (CASE WHEN expiry_date IS NULL THEN NULL WHEN expiry_date < CURRENT_DATE() THEN 'vencido' WHEN expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL ${threshold} DAY) THEN 'por_vencer' ELSE 'ok' END) AS expiry_status
    FROM productos
    WHERE activo = 1 AND (stock_actual <= stock_minimo OR (expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL ${threshold} DAY)))
    ORDER BY stock_actual ASC, expiry_status DESC, id DESC`;

  const [rows] = await pool.query(sql);
  return rows;
}

module.exports = { listStockBajo };
