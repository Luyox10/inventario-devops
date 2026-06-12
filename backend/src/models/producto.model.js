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

function parseDateOnly(value) {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
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
    expiry_date: parseDateOnly(data?.expiry_date),
    precio,
    stock_actual: toSafeInt(data?.stock_actual, 0),
    stock_minimo: toSafeInt(data?.stock_minimo, 0),
  };
}

async function listProductos({ includeInactive = false } = {}) {
  const where = includeInactive ? '' : 'WHERE p.activo = 1';
  const [rows] = await pool.query(
    `SELECT p.id,
            p.nombre,
            p.sku,
            p.unidad,
            p.descripcion,
            p.precio,
            p.stock_actual,
            p.stock_minimo,
            p.activo,
            p.created_at,
            p.updated_at,
            COALESCE(l.min_expiry, p.expiry_date) AS expiry_date,
            DATEDIFF(COALESCE(l.min_expiry, p.expiry_date), CURRENT_DATE()) AS days_to_expire
     FROM productos p
     LEFT JOIN (
       SELECT producto_id, MIN(expiry_date) AS min_expiry
       FROM lotes
       WHERE activo = 1 AND expiry_date IS NOT NULL
       GROUP BY producto_id
     ) l ON l.producto_id = p.id
     ${where}
     ORDER BY p.id DESC`
  );
  return rows;
}

async function getProductoById(id) {
  const [rows] = await pool.query(
    `SELECT p.id,
            p.nombre,
            p.sku,
            p.unidad,
            p.descripcion,
            p.precio,
            p.stock_actual,
            p.stock_minimo,
            p.activo,
            p.created_at,
            p.updated_at,
            COALESCE(l.min_expiry, p.expiry_date) AS expiry_date,
            DATEDIFF(COALESCE(l.min_expiry, p.expiry_date), CURRENT_DATE()) AS days_to_expire
     FROM productos p
     LEFT JOIN (
       SELECT producto_id, MIN(expiry_date) AS min_expiry
       FROM lotes
       WHERE activo = 1 AND expiry_date IS NOT NULL
       GROUP BY producto_id
     ) l ON l.producto_id = p.id
     WHERE p.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createLote(productoId, cantidad, expiry_date) {
  const qty = Math.max(0, Number(cantidad || 0));
  if (qty <= 0) return null;
  const [result] = await pool.query(
    'INSERT INTO lotes (producto_id, cantidad, expiry_date) VALUES (?, ?, ?)',
    [productoId, qty, expiry_date || null]
  );
  return { id: result.insertId, producto_id: productoId, cantidad: qty, expiry_date: expiry_date || null };
}

async function createProducto(data) {
  const payload = normalizeCreateProductoInput(data);
  if (!payload) {
    throw new Error('Invalid producto payload for insert');
  }

  let result;
  try {
    [result] = await pool.query(
      `INSERT INTO productos (nombre, sku, unidad, descripcion, expiry_date, precio, stock_actual, stock_minimo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.nombre,
        payload.sku,
        payload.unidad,
        payload.descripcion,
        payload.expiry_date,
        payload.precio,
        payload.stock_actual,
        payload.stock_minimo,
      ]
    );

    if (payload.stock_actual > 0) {
      await createLote(result.insertId, payload.stock_actual, payload.expiry_date);
    }
  } catch (err) {
    console.error('[producto.model:createProducto] insert failed', {
      payload,
      message: err?.message,
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage,
      stack: err?.stack,
    });
    throw err;
  }

  return {
    id: result.insertId,
    ...payload,
  };
}

async function updateProducto(id, { nombre, sku, unidad, descripcion, precio, stock_actual, stock_minimo, activo, expiry_date }) {
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
    expiry_date: expiry_date == null ? existing.expiry_date : parseDateOnly(expiry_date),
  };

  await pool.query(
    `UPDATE productos
     SET nombre = ?, sku = ?, unidad = ?, descripcion = ?, expiry_date = ?, precio = ?, stock_actual = ?, stock_minimo = ?, activo = ?
     WHERE id = ?`,
    [
      next.nombre,
      next.sku,
      next.unidad,
      next.descripcion,
      next.expiry_date || null,
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

async function allocateLotesForSalida(connection, producto_id, cantidad) {
  const qty = Math.max(0, Number(cantidad || 0));
  if (!connection || qty <= 0) return [];

  const [lots] = await connection.query(
    `SELECT id, cantidad, expiry_date
     FROM lotes
     WHERE producto_id = ? AND activo = 1
     ORDER BY expiry_date IS NULL, expiry_date ASC, id ASC
     FOR UPDATE`,
    [producto_id]
  );

  let remaining = qty;
  const allocations = [];

  for (const lot of lots) {
    if (remaining <= 0) break;
    const available = Number(lot.cantidad || 0);
    if (available <= 0) continue;

    const taken = Math.min(available, remaining);
    const nextQty = available - taken;

    if (nextQty <= 0) {
      await connection.query('UPDATE lotes SET cantidad = 0, activo = 0 WHERE id = ?', [lot.id]);
    } else {
      await connection.query('UPDATE lotes SET cantidad = ? WHERE id = ?', [nextQty, lot.id]);
    }

    allocations.push({ lote_id: lot.id, cantidad: taken });
    remaining -= taken;
  }

  return allocations;
}

module.exports = {
  listProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProductoSoft,
  updateStockCantidad,
  updateStockMinimo,
  createLote,
  allocateLotesForSalida,
};
