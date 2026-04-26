const { verifyToken } = require('../utils/jwt');
const { httpError } = require('../utils/httpError');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(httpError(401, 'Unauthorized'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, rol: payload.rol };
    return next();
  } catch (err) {
    return next(httpError(401, 'Unauthorized'));
  }
}

module.exports = { authMiddleware };
