const productoModel = require('../models/producto.model');
const { pool } = require('../config/db');
const { httpError } = require('../utils/httpError');

async function updateCantidad({ productoId, stock_actual, tipo, cantidad, motivo, expiry_date, userId }) {
  const existing = await productoModel.getProductoById(productoId);
  if (!existing) throw httpError(404, 'Producto no encontrado');

  const hasStockActual = stock_actual !== undefined && stock_actual !== null && stock_actual !== '';
  const hasCantidad = cantidad !== undefined && cantidad !== null && cantidad !== '';

  if (!hasStockActual && !hasCantidad) {
    throw httpError(400, 'Debes enviar stock_actual o cantidad');
  }

  // Caso 1: Ajuste directo (compatibilidad)
  if (hasStockActual) {
    const nextStock = Number(stock_actual);
    if (Number.isNaN(nextStock) || nextStock < 0) throw httpError(400, 'stock_actual inválido');

    const delta = nextStock - Number(existing.stock_actual);
    const next = await productoModel.updateStockCantidad(productoId, nextStock);

    await pool.query(
      `INSERT INTO movimientos (producto_id, usuario_id, venta_id, tipo, cantidad, motivo)
       VALUES (?, ?, NULL, 'AJUSTE', ?, ?)`,
      [
        productoId,
        userId,
        Math.abs(delta),
        motivo || `Ajuste de stock (${existing.stock_actual} → ${nextStock})`,
      ]
    );

    return next;
  }

  // Caso 2: Movimiento (ENTRADA/SALIDA)
  const qty = Number(cantidad);
  if (Number.isNaN(qty) || qty <= 0) throw httpError(400, 'cantidad inválida');

  const movimientoTipo = (tipo || 'ENTRADA').toUpperCase();
  if (!['ENTRADA', 'SALIDA'].includes(movimientoTipo)) {
    throw httpError(400, 'tipo inválido');
  }

  const current = Number(existing.stock_actual);
  const nextStock = movimientoTipo === 'ENTRADA' ? current + qty : current - qty;
  if (nextStock < 0) throw httpError(400, 'Stock insuficiente');

  const next = await productoModel.updateStockCantidad(productoId, nextStock);

  if (movimientoTipo === 'ENTRADA') {
    await productoModel.createLote(productoId, qty, expiry_date || null);
  } else {
    await productoModel.allocateLotesForSalida(pool, productoId, qty);
  }

  await pool.query(
    `INSERT INTO movimientos (producto_id, usuario_id, venta_id, tipo, cantidad, motivo)
     VALUES (?, ?, NULL, ?, ?, ?)`,
    [productoId, userId, movimientoTipo, qty, motivo || null]
  );

  return next;
}

async function updateMinimo({ productoId, stock_minimo }) {
  const existing = await productoModel.getProductoById(productoId);
  if (!existing) throw httpError(404, 'Producto no encontrado');

  return productoModel.updateStockMinimo(productoId, stock_minimo);
}

module.exports = { updateCantidad, updateMinimo };
