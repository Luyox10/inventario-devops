function errorMiddleware(err, req, res, next) {
  let status = Number(err.status || 500);
  let message = err.message || 'Internal Server Error';

  if (err && err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Registro duplicado';
  }

  if (process.env.NODE_ENV !== 'test') {
    const code = err && err.code ? ` code=${err.code}` : '';
    const errno = err && err.errno != null ? ` errno=${err.errno}` : '';
    const state = err && err.sqlState ? ` sqlState=${err.sqlState}` : '';
    const sqlMessage = err && err.sqlMessage ? ` sqlMessage="${err.sqlMessage}"` : '';
    process.stderr.write(`${req.method} ${req.originalUrl} -> ${status} ${message}${code}${errno}${state}${sqlMessage}\n`);
    if (err && err.stack) process.stderr.write(`${err.stack}\n`);
  }

  res.status(status).json({ message });
}

module.exports = { errorMiddleware };
