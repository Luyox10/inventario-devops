const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Firma simetrica HS256 con secreto compartido (JWT_SECRET).
// Se restringe verify a HS256 para evitar ataques de alg:none
// y confusion de algoritmo RS256->HS256.
const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = process.env.JWT_ISSUER || 'bodega-helena';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'bodega-helena-web';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT_SECRET is required');
    err.status = 500;
    throw err;
  }
  return secret;
}

// payload: { id, rol, token_version }
// Agrega claims estandar: iss, aud, jti (id unico del token).
function signToken(payload) {
  const secret = getSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(),
    },
    secret,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

// Verifica firma, expiracion, emisor y audiencia. Solo acepta HS256.
function verifyToken(token) {
  const secret = getSecret();

  return jwt.verify(token, secret, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

module.exports = { signToken, verifyToken, JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE };
