const productoModel = require('../models/producto.model');
const { pool } = require('../config/db');
const { httpError } = require('../utils/httpError');

async function updateCantidad({ productoId, stock_actual, userId }) {
  const existing = await productoModel.getProductoById(productoId);
  if (!existing) throw httpError(404, 'Producto no encontrado');

  const next = await productoModel.updateStockCantidad(productoId, stock_actual);

  await pool.query(
    `INSERT INTO movimientos (producto_id, usuario_id, venta_id, tipo, cantidad, motivo)
     VALUES (?, ?, NULL, 'AJUSTE', ?, 'Actualización de stock')`,
    [productoId, userId, Number(stock_actual) - Number(existing.stock_actual)]
  );

  return next;
}

async function updateMinimo({ productoId, stock_minimo }) {
  const existing = await productoModel.getProductoById(productoId);
  if (!existing) throw httpError(404, 'Producto no encontrado');

  return productoModel.updateStockMinimo(productoId, stock_minimo);
}

module.exports = { updateCantidad, updateMinimo };
