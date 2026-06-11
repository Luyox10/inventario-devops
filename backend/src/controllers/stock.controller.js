const stockService = require('../services/stock.service');

async function updateCantidad(req, res, next) {
  try {
    const productoId = Number(req.params.productoId);
    const { stock_actual, tipo, cantidad, motivo, expiry_date } = req.body || {};
    const result = await stockService.updateCantidad({
      productoId,
      stock_actual,
      tipo,
      cantidad,
      motivo,
      expiry_date,
      userId: req.user.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateMinimo(req, res, next) {
  try {
    const productoId = Number(req.params.productoId);
    const { stock_minimo } = req.body || {};
    const result = await stockService.updateMinimo({ productoId, stock_minimo });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { updateCantidad, updateMinimo };
