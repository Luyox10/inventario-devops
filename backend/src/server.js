const app = require('./app');
const { testConnection } = require('./config/db');
const { getMLHealth, trainModelo, simulateAndTrain } = require('./services/prediccion.service');

const port = Number(process.env.PORT || 3000);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureModelTrained() {
  try {
    let health = null;
    let attempts = 0;

    while (attempts < 10) {
      try {
        health = await getMLHealth();
        break;
      } catch (err) {
        attempts += 1;
        if (attempts >= 10) throw err;
        process.stdout.write(`ML service not ready, retrying (${attempts}/10)...\n`);
        await sleep(2000);
      }
    }

    if (health?.modelo_entrenado) {
      process.stdout.write(`ML model already trained (${health.registros_entrenamiento} records).\n`);
      return;
    }

    process.stdout.write('ML model not trained. Training with real sales data...\n');
    try {
      const result = await trainModelo();
      process.stdout.write(`ML model trained with ${result.registros} real records.\n`);
      return;
    } catch (trainError) {
      const message = trainError.message || '';
      const needsSimulation = message.includes('al menos') || message.includes('MIN_ROWS') || trainError.status === 400;
      if (!needsSimulation) throw trainError;

      process.stdout.write('Not enough real sales data. Training with simulated data...\n');
      const simResult = await simulateAndTrain({ dias: 90 });
      process.stdout.write(`ML model trained with simulated data: ${simResult.entrenamiento.registros} records.\n`);
    }
  } catch (error) {
    process.stderr.write(`ML auto-training skipped: ${error.message}\n`);
  }
}

async function startServer() {
  try {
    const dbNow = await testConnection();
    process.stdout.write(`DB connection OK. SELECT NOW(): ${dbNow.now}\n`);

    ensureModelTrained();

    app.listen(port, () => {
      process.stdout.write(`API listening on port ${port}\n`);
    });
  } catch (error) {
    process.stderr.write(`DB connection failed: ${error.message}\n`);
    process.exit(1);
  }
}

startServer();
