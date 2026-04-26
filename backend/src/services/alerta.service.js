const alertaModel = require('../models/alerta.model');

async function stockBajo() {
  return alertaModel.listStockBajo();
}

module.exports = { stockBajo };
