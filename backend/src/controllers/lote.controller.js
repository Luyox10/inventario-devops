const productoModel = require('../models/producto.model');
const { httpError } = require('../utils/httpError');

async function getLotesByProducto(req, res, next) {
  try {
    const producto_id = Number(req.params.productoId);
    if (!producto_id) throw httpError(400, 'productoId inválido');
    const lotes = await productoModel.getLotesByProducto(producto_id);
    res.json(lotes);
  } catch (err) {
    next(err);
  }
}

async function updateLoteExpiry(req, res, next) {
  try {
    const lote_id = Number(req.params.loteId);
    if (!lote_id) throw httpError(400, 'loteId inválido');
    const { expiry_date } = req.body || {};
    const updated = await productoModel.updateLoteExpiry(lote_id, expiry_date || null);
    if (!updated) throw httpError(404, 'Lote no encontrado o inactivo');
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function darDeBajaLote(req, res, next) {
  try {
    const lote_id = Number(req.params.loteId);
    if (!lote_id) throw httpError(400, 'loteId inválido');
    const result = await productoModel.darDeBajaLote(lote_id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function ajustarLote(req, res, next) {
  try {
    const lote_id = Number(req.params.loteId);
    if (!lote_id) throw httpError(400, 'loteId inválido');
    const { nueva_cantidad, motivo } = req.body || {};
    if (nueva_cantidad === undefined || nueva_cantidad === null || nueva_cantidad === '') {
      throw httpError(400, 'nueva_cantidad es requerida');
    }
    const result = await productoModel.ajustarLote(lote_id, Number(nueva_cantidad), req.user.id, motivo || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getLotesByProducto, updateLoteExpiry, darDeBajaLote, ajustarLote };
