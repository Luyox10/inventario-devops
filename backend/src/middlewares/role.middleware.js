const { httpError } = require('../utils/httpError');

function roleMiddleware(rol) {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return next(httpError(401, 'Unauthorized'));
    }

    if (req.user.rol !== rol) {
      return next(httpError(403, 'Forbidden'));
    }

    return next();
  };
}

module.exports = { roleMiddleware };
