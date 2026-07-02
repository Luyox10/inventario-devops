const { getPredictiones, getMLHealth } = require('../services/prediccion.service');

async function health(req, res, next) {
  try {
    const data = await getMLHealth();
    res.json(data);
  } catch (err) {
    console.error('[prediccion.controller] ML health failed:', err.message || err);
    res.json({ status: 'unavailable', modelo_entrenado: false, error: err.message || 'ML service unreachable' });
  }
}

async function predict(req, res, next) {
  try {
    const dias = Number(req.query.dias) || 7;
    const result = await getPredictiones({ dias });
    res.json(result);
  } catch (err) {
    if (err.status === 503) {
      return res.status(503).json({
        modelo_listo: false,
        error: err.message,
      });
    }
    next(err);
  }
}

module.exports = { health, predict };
