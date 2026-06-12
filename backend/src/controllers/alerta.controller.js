const alertaService = require('../services/alerta.service');

async function stockBajo(req, res, next) {
  try {
    const rows = await alertaService.stockBajo();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function productosVencidos(req, res, next) {
  try {
    const data = await alertaService.productosVencidos();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { stockBajo, productosVencidos };
