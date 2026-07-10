const { getPredictiones, getMLHealth, trainModelo } = require('../services/prediccion.service');

let trainingPromise = null;

async function health(req, res, next) {
  try {
    const data = await getMLHealth();

    if (!data.modelo_entrenado && !trainingPromise) {
      console.log('[prediccion.controller] Modelo no entrenado. Iniciando entrenamiento automático...');
      trainingPromise = trainModelo()
        .then(() => getMLHealth())
        .catch((err) => {
          console.error('[prediccion.controller] Error entrenando automáticamente:', err.message || err);
        })
        .finally(() => {
          trainingPromise = null;
        });

      return res.json({ status: 'training', modelo_entrenado: false, mensaje: 'El modelo se está entrenando automáticamente. Intenta en unos segundos.' });
    }

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
