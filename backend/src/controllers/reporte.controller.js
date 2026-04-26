const reporteService = require('../services/reporte.service');

async function dashboard(req, res, next) {
  try {
    const data = await reporteService.dashboard();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { dashboard };
