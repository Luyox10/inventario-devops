const { trainModelo, simulateAndTrain, getPredictiones, getMLHealth, getMetrics } = require('../services/prediccion.service');

async function health(req, res, next) {
  try {
    const data = await getMLHealth();
    res.json(data);
  } catch {
    res.json({ status: 'unavailable', modelo_entrenado: false });
  }
}

async function train(req, res, next) {
  try {
    const result = await trainModelo();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function simulate(req, res, next) {
  try {
    const dias = Number(req.query.dias) || 90;
    const result = await simulateAndTrain({ dias });
    res.json(result);
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
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

async function metrics(req, res, next) {
  try {
    const result = await getMetrics();
    res.json(result);
  } catch (err) {
    if (err.status === 503) {
      return res.status(503).json({ modelo_listo: false, error: err.message });
    }
    next(err);
  }
}

module.exports = { health, train, simulate, predict, metrics };
