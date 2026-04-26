const { withTransaction } = require('../config/db');
const ventaModel = require('../models/venta.model');
const { httpError } = require('../utils/httpError');

async function crearVenta({ usuarioId, items }) {
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, 'Items requeridos');

  return withTransaction(async (connection) => {
    let total = 0;

    const enriched = [];

    for (const item of items) {
      const producto_id = Number(item.producto_id);
      const cantidad = Number(item.cantidad);
      if (!producto_id || !cantidad || cantidad <= 0) throw httpError(400, 'Item inválido');

      const producto = await ventaModel.getProductoForUpdate(connection, producto_id);
      if (!producto) throw httpError(404, `Producto ${producto_id} no encontrado`);
      if (!producto.activo) throw httpError(409, `Producto ${producto_id} inactivo`);

      if (Number(producto.stock_actual) < cantidad) {
        throw httpError(409, `Stock insuficiente para producto ${producto_id}`);
      }

      const precio_unitario = Number(producto.precio);
      const subtotal = Number((precio_unitario * cantidad).toFixed(2));
      total = Number((total + subtotal).toFixed(2));

      enriched.push({ producto_id, cantidad, precio_unitario, subtotal, producto });
    }

    const venta_id = await ventaModel.createVenta(connection, { usuario_id: usuarioId, total });

    for (const it of enriched) {
      await ventaModel.createDetalleVenta(connection, {
        venta_id,
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal: it.subtotal,
      });

      const nextStock = Number(it.producto.stock_actual) - Number(it.cantidad);
      await ventaModel.updateProductoStock(connection, { producto_id: it.producto_id, stock_actual: nextStock });

      await ventaModel.createMovimiento(connection, {
        producto_id: it.producto_id,
        usuario_id: usuarioId,
        venta_id,
        tipo: 'SALIDA',
        cantidad: it.cantidad,
        motivo: 'Venta',
      });
    }

    return { id: venta_id, total };
  });
}

async function listVentas({ from, to }) {
  return ventaModel.listVentas({ from, to });
}

module.exports = { crearVenta, listVentas };
