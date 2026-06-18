const ventaService = require('../services/venta.service');

async function crearVenta(req, res, next) {
  try {
    const { items } = req.body || {};
    const result = await ventaService.crearVenta({ usuarioId: req.user.id, items });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function listVentas(req, res, next) {
  try {
    const { from, to } = req.query || {};
    const rows = await ventaService.listVentas({ from, to });
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getVentaDetalle(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });
    const data = await ventaService.getVentaDetalle(id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { crearVenta, listVentas, getVentaDetalle };
