const { pool } = require('../config/db');

async function listProductos({ includeInactive = false } = {}) {
  const where = includeInactive ? '' : 'WHERE activo = 1';
  const [rows] = await pool.query(
    `SELECT id, nombre, sku, descripcion, precio, stock_actual, stock_minimo, activo, created_at, updated_at
     FROM productos
     ${where}
     ORDER BY id DESC`
  );
  return rows;
}

async function getProductoById(id) {
  const [rows] = await pool.query(
    `SELECT id, nombre, sku, descripcion, precio, stock_actual, stock_minimo, activo, created_at, updated_at
     FROM productos
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createProducto({ nombre, sku, descripcion, precio, stock_actual, stock_minimo }) {
  const [result] = await pool.query(
    `INSERT INTO productos (nombre, sku, descripcion, precio, stock_actual, stock_minimo, activo)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [
      nombre,
      sku || null,
      descripcion || null,
      precio,
      Number(stock_actual || 0),
      Number(stock_minimo || 0),
    ]
  );

  return getProductoById(result.insertId);
}

async function updateProducto(id, { nombre, sku, descripcion, precio, stock_actual, stock_minimo, activo }) {
  const existing = await getProductoById(id);
  if (!existing) return null;

  const next = {
    nombre: nombre ?? existing.nombre,
    sku: sku ?? existing.sku,
    descripcion: descripcion ?? existing.descripcion,
    precio: precio ?? existing.precio,
    stock_actual: stock_actual ?? existing.stock_actual,
    stock_minimo: stock_minimo ?? existing.stock_minimo,
    activo: activo ?? existing.activo,
  };

  await pool.query(
    `UPDATE productos
     SET nombre = ?, sku = ?, descripcion = ?, precio = ?, stock_actual = ?, stock_minimo = ?, activo = ?
     WHERE id = ?`,
    [
      next.nombre,
      next.sku,
      next.descripcion,
      next.precio,
      Number(next.stock_actual),
      Number(next.stock_minimo),
      Number(next.activo),
      id,
    ]
  );

  return getProductoById(id);
}

async function deleteProductoSoft(id) {
  const existing = await getProductoById(id);
  if (!existing) return null;

  await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
  return getProductoById(id);
}

async function updateStockCantidad(id, stock_actual) {
  await pool.query('UPDATE productos SET stock_actual = ? WHERE id = ?', [Number(stock_actual), id]);
  return getProductoById(id);
}

async function updateStockMinimo(id, stock_minimo) {
  await pool.query('UPDATE productos SET stock_minimo = ? WHERE id = ?', [Number(stock_minimo), id]);
  return getProductoById(id);
}

module.exports = {
  listProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProductoSoft,
  updateStockCantidad,
  updateStockMinimo,
};
