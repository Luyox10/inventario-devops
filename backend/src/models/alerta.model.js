const { pool } = require('../config/db');

async function listStockBajo() {
  const [rows] = await pool.query(
    `SELECT id, nombre, sku, precio, stock_actual, stock_minimo
     FROM productos
     WHERE activo = 1 AND stock_actual <= stock_minimo
     ORDER BY stock_actual ASC, id DESC`
  );
  return rows;
}

module.exports = { listStockBajo };
