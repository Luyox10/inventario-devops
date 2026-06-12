const alertaModel = require('../models/alerta.model');

async function stockBajo() {
  return alertaModel.listStockBajo();
}

async function productosVencidos() {
  return alertaModel.listProductosVencidos();
}

module.exports = { stockBajo, productosVencidos };
