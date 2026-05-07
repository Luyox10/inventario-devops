const { pool } = require('../config/db');

function toNullableTrimmedString(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function toRequiredTrimmedString(value, fallback = '') {
  if (value == null) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
}

function toSafeInt(value, fallback = 0) {
  if (value == null || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.trunc(num));
}

function toSafeDecimal(value, fallback = 0) {
  if (value == null || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Number(num.toFixed(2));
}

function normalizeCreateProductoInput(data) {
  const nombre = toRequiredTrimmedString(data?.nombre);
  const precio = toSafeDecimal(data?.precio, NaN);
  if (!nombre || !Number.isFinite(precio) || precio < 0) return null;

  return {
    nombre,
    sku: toNullableTrimmedString(data?.sku),
    unidad: toRequiredTrimmedString(data?.unidad, 'und'),
    descripcion: toNullableTrimmedString(data?.descripcion),
    precio,
    stock_actual: toSafeInt(data?.stock_actual, 0),
    stock_minimo: toSafeInt(data?.stock_minimo, 0),
  };
}

async function listProductos({ includeInactive = false } = {}) {
  const where = includeInactive ? '' : 'WHERE activo = 1';
  const [rows] = await pool.query(
    `SELECT id, nombre, sku, unidad, descripcion, precio, stock_actual, stock_minimo, activo, created_at, updated_at
     FROM productos
     ${where}
     ORDER BY id DESC`
  );
  return rows;
}

async function getProductoById(id) {
  const [rows] = await pool.query(
    `SELECT id, nombre, sku, unidad, descripcion, precio, stock_actual, stock_minimo, activo, created_at, updated_at
     FROM productos
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createProducto(data) {
  const payload = normalizeCreateProductoInput(data);
  if (!payload) {
    throw new Error('Invalid producto payload for insert');
  }

  const [result] = await pool.query(
    `INSERT INTO productos (nombre, sku, unidad, descripcion, precio, stock_actual, stock_minimo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.nombre,
      payload.sku,
      payload.unidad,
      payload.descripcion,
      payload.precio,
      payload.stock_actual,
      payload.stock_minimo
    ]
  );

  return {
    id: result.insertId,
    ...payload
  };
}

async function updateProducto(id, { nombre, sku, unidad, descripcion, precio, stock_actual, stock_minimo, activo }) {
  const existing = await getProductoById(id);
  if (!existing) return null;

  const next = {
    nombre: nombre ?? existing.nombre,
    sku: sku ?? existing.sku,
    unidad: unidad ?? existing.unidad,
    descripcion: descripcion ?? existing.descripcion,
    precio: precio ?? existing.precio,
    stock_actual: stock_actual ?? existing.stock_actual,
    stock_minimo: stock_minimo ?? existing.stock_minimo,
    activo: activo ?? existing.activo,
  };

  await pool.query(
    `UPDATE productos
     SET nombre = ?, sku = ?, unidad = ?, descripcion = ?, precio = ?, stock_actual = ?, stock_minimo = ?, activo = ?
     WHERE id = ?`,
    [
      next.nombre,
      next.sku,
      next.unidad,
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

function normalizeProductoId(id) {
  const pid = Number.parseInt(String(id), 10);
  if (!Number.isFinite(pid) || pid <= 0) return null;
  return pid;
}

/**
 * Elimina el producto: borrado físico si no hay referencias en ventas/movimientos;
 * si hay historial, baja lógica (activo = 0). Todo en una conexión para lecturas coherentes (TiDB).
 */
async function deleteProductoSoft(id) {
  const pid = normalizeProductoId(id);
  if (pid == null) return null;

  const conn = await pool.getConnection();
  try {
    const [existingRows] = await conn.query(
      'SELECT id FROM productos WHERE id = ? LIMIT 1',
      [pid]
    );
    if (!existingRows.length) return null;

    const [[dv]] = await conn.query(
      'SELECT COUNT(*) AS c FROM detalle_ventas WHERE producto_id = ?',
      [pid]
    );
    const [[mv]] = await conn.query(
      'SELECT COUNT(*) AS c FROM movimientos WHERE producto_id = ?',
      [pid]
    );
    const refCount = Number(dv.c || 0) + Number(mv.c || 0);

    if (refCount === 0) {
      const [delRes] = await conn.query('DELETE FROM productos WHERE id = ?', [pid]);
      if (!delRes.affectedRows) return null;
      return { id: pid, eliminado: true, permanente: true };
    }

    await conn.query('UPDATE productos SET activo = 0 WHERE id = ?', [pid]);

    const [rows] = await conn.query(
      `SELECT id, nombre, sku, unidad, descripcion, precio, stock_actual, stock_minimo, activo, created_at, updated_at
       FROM productos WHERE id = ? LIMIT 1`,
      [pid]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
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
