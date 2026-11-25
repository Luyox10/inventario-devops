const argon2 = require('argon2');
const bcrypt = require('bcryptjs');

// Parametros Argon2id recomendados por OWASP para hashing de contrasenas.
// Configurables por variables de entorno para ajustar en produccion.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: Number(process.env.ARGON2_MEMORY_COST) || 65536, // 64 MB
  timeCost: Number(process.env.ARGON2_TIME_COST) || 3,
  parallelism: Number(process.env.ARGON2_PARALLELISM) || 4,
  hashLength: 32,
};

// Hash dummy precalculado para igualar tiempos de respuesta cuando el
// usuario no existe (mitiga enumeracion de usuarios por timing).
// Se genera una vez al cargar el modulo con los mismos parametros.
let dummyHashPromise = null;
function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2.hash('dummy-password-for-timing', ARGON2_OPTIONS);
  }
  return dummyHashPromise;
}

function isBcryptHash(hash) {
  return typeof hash === 'string' && /^\$2[aby]\$/.test(hash);
}

function isArgon2Hash(hash) {
  return typeof hash === 'string' && hash.startsWith('$argon2');
}

async function hashPassword(plain) {
  return argon2.hash(String(plain), ARGON2_OPTIONS);
}

// Verifica la contrasena contra el hash almacenado.
// Devuelve { ok, needsRehash } — needsRehash indica que el hash es un
// formato antiguo (bcrypt) y debe migrarse a Argon2id (lazy rehash).
async function verifyPassword(storedHash, plain) {
  if (isArgon2Hash(storedHash)) {
    try {
      const ok = await argon2.verify(storedHash, String(plain));
      return { ok, needsRehash: ok && argon2.needsRehash(storedHash, ARGON2_OPTIONS) };
    } catch {
      return { ok: false, needsRehash: false };
    }
  }
  if (isBcryptHash(storedHash)) {
    const ok = await bcrypt.compare(String(plain), storedHash);
    return { ok, needsRehash: ok };
  }
  return { ok: false, needsRehash: false };
}

// Ejecuta una verificacion contra el hash dummy para mantener
// tiempo de respuesta constante cuando el usuario no existe.
async function verifyDummy(plain) {
  const dummyHash = await getDummyHash();
  try {
    await argon2.verify(dummyHash, String(plain));
  } catch {
    // ignorar; solo se busca consumir tiempo de CPU equivalente
  }
}

module.exports = { hashPassword, verifyPassword, verifyDummy, ARGON2_OPTIONS };
