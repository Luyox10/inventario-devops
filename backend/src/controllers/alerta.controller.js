const alertaService = require('../services/alerta.service');

async function stockBajo(req, res, next) {
  try {
    const rows = await alertaService.stockBajo();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { stockBajo };
