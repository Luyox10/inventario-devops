const { pool } = require('../config/db');

async function createVenta(connection, { usuario_id, total }) {
  const [result] = await connection.query(
    'INSERT INTO ventas (usuario_id, total) VALUES (?, ?)',
    [usuario_id, total]
  );
  return result.insertId;
}

async function createDetalleVenta(connection, { venta_id, producto_id, cantidad, precio_unitario, subtotal }) {
  await connection.query(
    `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
     VALUES (?, ?, ?, ?, ?)`,
    [venta_id, producto_id, cantidad, precio_unitario, subtotal]
  );
}

async function getProductoForUpdate(connection, producto_id) {
  const [rows] = await connection.query(
    'SELECT id, nombre, precio, stock_actual, stock_minimo, activo FROM productos WHERE id = ? FOR UPDATE',
    [producto_id]
  );
  return rows[0] || null;
}

async function updateProductoStock(connection, { producto_id, stock_actual }) {
  await connection.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [stock_actual, producto_id]);
}

async function createMovimiento(connection, { producto_id, usuario_id, venta_id, tipo, cantidad, motivo }) {
  await connection.query(
    `INSERT INTO movimientos (producto_id, usuario_id, venta_id, tipo, cantidad, motivo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [producto_id, usuario_id, venta_id || null, tipo, cantidad, motivo || null]
  );
}

async function listVentas({ from, to } = {}) {
  const params = [];
  const where = [];

  if (from) {
    where.push('created_at >= ?');
    params.push(from);
  }
  if (to) {
    where.push('created_at <= ?');
    params.push(to);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT id, usuario_id, total, created_at
     FROM ventas
     ${whereSql}
     ORDER BY created_at DESC`,
    params
  );

  return rows;
}

module.exports = {
  createVenta,
  createDetalleVenta,
  getProductoForUpdate,
  updateProductoStock,
  createMovimiento,
  listVentas,
};
