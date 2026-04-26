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
  if (!data || !data.nombre || data.precio == null) {
    throw httpError(400, 'Datos inválidos');
  }
  return productoModel.createProducto(data);
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
