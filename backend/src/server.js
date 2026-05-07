const app = require('./app');
const { testConnection } = require('./config/db');

const port = Number(process.env.PORT || 3000);

async function startServer() {
  try {
    const dbNow = await testConnection();
    process.stdout.write(`DB connection OK. SELECT NOW(): ${dbNow.now}\n`);
    app.listen(port, () => {
      process.stdout.write(`API listening on port ${port}\n`);
    });
  } catch (error) {
    process.stderr.write(`DB connection failed: ${error.message}\n`);
    process.exit(1);
  }
}

startServer();
