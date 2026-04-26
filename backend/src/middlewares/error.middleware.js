function errorMiddleware(err, req, res, next) {
  const status = Number(err.status || 500);
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test') {
    process.stderr.write(`${status} ${message}\n`);
  }

  res.status(status).json({ message });
}

module.exports = { errorMiddleware };
