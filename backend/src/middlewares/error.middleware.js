function errorMiddleware(err, req, res, next) {
  let status = Number(err.status || 500);
  let message = err.message || 'Internal Server Error';

  if (err && err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Registro duplicado';
  }

  if (process.env.NODE_ENV !== 'test') {
    const code = err && err.code ? ` (${err.code})` : '';
    process.stderr.write(`${status} ${message}${code}\n`);
    if (err && err.stack) process.stderr.write(`${err.stack}\n`);
  }

  res.status(status).json({ message });
}

module.exports = { errorMiddleware };
