function errorMiddleware(err, req, res, next) {
  let status = Number(err.status || 500);
  let message = err.message || 'Internal Server Error';

  if (err && err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Registro duplicado';
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('[error.middleware]', {
      method: req.method,
      url: req.originalUrl,
      status,
      message: err?.message || message,
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage,
      stack: err?.stack,
    });
  }

  res.status(status).json({ message });
}

module.exports = { errorMiddleware };
