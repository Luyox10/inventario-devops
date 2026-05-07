const productoModel = require('../models/producto.model');
const { httpError } = require('../utils/httpError');

async function list() {
  return productoModel.listProductos();
}

async function getById(id) {
  const p = await productoModel.getProductoById(id);
  if (!p) throw httpError(404, 'Producto no encontrado');
  return p;
}

async function create(data) {
  const nombre = data?.nombre != null ? String(data.nombre).trim() : '';
  const precio = Number(data?.precio);
  if (!nombre || !Number.isFinite(precio) || precio < 0) {
    throw httpError(400, 'Datos inválidos');
  }
  const created = await productoModel.createProducto(data);

  if (!created || !created.id) {
    throw httpError(500, 'Error creando producto');
  }

  return created;
}

async function update(id, data) {
  const updated = await productoModel.updateProducto(id, data || {});
  if (!updated) throw httpError(404, 'Producto no encontrado');
  return updated;
}

async function remove(id) {
  const removed = await productoModel.deleteProductoSoft(id);
  if (!removed) throw httpError(404, 'Producto no encontrado');
  return removed;
}

module.exports = { list, getById, create, update, remove };
