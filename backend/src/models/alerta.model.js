const { pool } = require('../config/db');

async function listStockBajo() {
  const threshold = Number(process.env.EXPIRY_THRESHOLD_DAYS) || 7;
  const sql = `SELECT p.id,
    p.nombre,
    p.sku,
    p.precio,
    p.stock_actual,
    p.stock_minimo,
    COALESCE(l.min_expiry, p.expiry_date) AS expiry_date,
    DATEDIFF(COALESCE(l.min_expiry, p.expiry_date), CURRENT_DATE()) AS days_to_expire,
    (CASE WHEN COALESCE(l.min_expiry, p.expiry_date) IS NULL THEN NULL
          WHEN COALESCE(l.min_expiry, p.expiry_date) < CURRENT_DATE() THEN 'vencido'
          WHEN COALESCE(l.min_expiry, p.expiry_date) <= DATE_ADD(CURRENT_DATE(), INTERVAL ${threshold} DAY) THEN 'por_vencer'
          ELSE 'ok'
     END) AS expiry_status
    FROM productos p
    LEFT JOIN (
      SELECT producto_id, MIN(expiry_date) AS min_expiry
      FROM lotes
      WHERE activo = 1
      GROUP BY producto_id
    ) l ON l.producto_id = p.id
    WHERE p.activo = 1 AND (p.stock_actual <= p.stock_minimo OR (COALESCE(l.min_expiry, p.expiry_date) IS NOT NULL AND COALESCE(l.min_expiry, p.expiry_date) <= DATE_ADD(CURRENT_DATE(), INTERVAL ${threshold} DAY)))
    ORDER BY p.stock_actual ASC, expiry_status DESC, p.id DESC`;

  const [rows] = await pool.query(sql);
  return rows;
}

module.exports = { listStockBajo };
