const { pool } = require('../config/db');

function isDateOnly(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeFromTo({ from, to }) {
  const next = { from, to };

  if (isDateOnly(next.from)) {
    next.from = `${next.from} 00:00:00`;
  }

  if (isDateOnly(next.to)) {
    next.to = `${next.to} 23:59:59`;
  }

  return next;
}

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

async function allocateLotesForSale(connection, producto_id, cantidad) {
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
  const consumed = [];

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

    consumed.push({ lote_id: lot.id, cantidad: taken, expiry_date: lot.expiry_date });
    remaining -= taken;
  }

  return consumed;
}

async function listVentas({ from, to } = {}) {
  const norm = normalizeFromTo({ from, to });
  const params = [];
  const where = [];

  if (norm.from) {
    where.push('v.created_at >= ?');
    params.push(norm.from);
  }
  if (norm.to) {
    where.push('v.created_at <= ?');
    params.push(norm.to);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT v.id,
            v.usuario_id,
            u.nombre AS usuario_nombre,
            u.email AS usuario_email,
            u.rol AS usuario_rol,
            v.total,
            v.created_at
     FROM ventas v
     INNER JOIN usuarios u ON u.id = v.usuario_id
     ${whereSql}
     ORDER BY v.created_at DESC`,
    params
  );

  return rows;
}

async function getVentaDetalle(venta_id) {
  const [header] = await pool.query(
    `SELECT v.id, v.total, v.created_at,
            u.nombre AS usuario_nombre, u.email AS usuario_email, u.rol AS usuario_rol
     FROM ventas v
     INNER JOIN usuarios u ON u.id = v.usuario_id
     WHERE v.id = ?`,
    [venta_id]
  );
  if (!header[0]) return null;

  const [items] = await pool.query(
    `SELECT dv.cantidad, dv.precio_unitario, dv.subtotal,
            p.nombre AS producto_nombre, p.sku, p.unidad
     FROM detalle_ventas dv
     INNER JOIN productos p ON p.id = dv.producto_id
     WHERE dv.venta_id = ?
     ORDER BY dv.id ASC`,
    [venta_id]
  );

  return { ...header[0], items };
}

module.exports = {
  createVenta,
  createDetalleVenta,
  getProductoForUpdate,
  updateProductoStock,
  createMovimiento,
  allocateLotesForSale,
  listVentas,
  getVentaDetalle,
};
