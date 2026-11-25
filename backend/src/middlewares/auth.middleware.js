const { verifyToken } = require('../utils/jwt');
const { httpError } = require('../utils/httpError');
const usuarioModel = require('../models/usuario.model');

async function authMiddleware(req, res, next) {
  const header = (req.headers.authorization || '').trim();
  const [type, token] = header.split(/\s+/, 2);

  if (!type || type.toLowerCase() !== 'bearer' || !token) {
    return next(httpError(401, 'Unauthorized'));
  }

  try {
    const payload = verifyToken(token);

    // Revocacion: el token_version del JWT debe coincidir con el actual
    // en BD. Si se incremento (logout, cambio de password), el token queda
    // invalido aunque la firma sea valida y no haya expirado.
    const dbUser = await usuarioModel.findById(payload.id);
    if (!dbUser || !dbUser.activo) {
      return next(httpError(401, 'Unauthorized'));
    }
    const dbVersion = Number(dbUser.token_version || 0);
    const tokenVersion = Number(payload.token_version || 0);
    if (tokenVersion !== dbVersion) {
      return next(httpError(401, 'Token revocado'));
    }

    req.user = { id: payload.id, rol: payload.rol };
    return next();
  } catch (err) {
    if (err && err.status) return next(err);
    return next(httpError(401, 'Unauthorized'));
  }
}

module.exports = { authMiddleware };
