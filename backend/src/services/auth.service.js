const usuarioModel = require('../models/usuario.model');
const { httpError } = require('../utils/httpError');
const { signToken } = require('../utils/jwt');
const { hashPassword, verifyPassword, verifyDummy } = require('../utils/password');

// Configuracion anti fuerza bruta (por cuenta)
const MAX_FAILED_ATTEMPTS = Number(process.env.AUTH_MAX_FAILED_ATTEMPTS) || 5;
const LOCKOUT_MINUTES = Number(process.env.AUTH_LOCKOUT_MINUTES) || 15;

function buildAuditContext(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 255) || null;
  return { ip, userAgent };
}

async function audit({ email, usuarioId, success, motivo, ctx }) {
  try {
    await usuarioModel.insertLoginAttempt({
      email,
      usuarioId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      success,
      motivo,
    });
  } catch {
    // La auditoria no debe romper el login si la tabla no existe aun.
  }
}

async function login({ email, password }, req) {
  const ctx = buildAuditContext(req || { headers: {}, socket: {} });
  const user = await usuarioModel.findByEmail(email);

  // Timing-safe: si el usuario no existe, se consume el mismo tiempo de
  // verificacion Argon2id para no revelar si el email esta registrado.
  if (!user) {
    await verifyDummy(password);
    await audit({ email, usuarioId: null, success: false, motivo: 'usuario_no_existe', ctx });
    throw httpError(401, 'Credenciales inválidas');
  }

  if (!user.activo) {
    await verifyDummy(password);
    await audit({ email, usuarioId: user.id, success: false, motivo: 'usuario_inactivo', ctx });
    throw httpError(403, 'Usuario inactivo');
  }

  // Bloqueo por cuenta: si locked_until esta en el futuro, rechaza.
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    await audit({ email, usuarioId: user.id, success: false, motivo: 'cuenta_bloqueada', ctx });
    throw httpError(423, `Cuenta bloqueada. Intenta de nuevo en ${mins} minutos.`);
  }

  const { ok, needsRehash } = await verifyPassword(user.password_hash, password);

  if (!ok) {
    await usuarioModel.registerFailedAttempt(user.id, {
      maxAttempts: MAX_FAILED_ATTEMPTS,
      lockoutMinutes: LOCKOUT_MINUTES,
    });
    await audit({ email, usuarioId: user.id, success: false, motivo: 'password_incorrecta', ctx });
    throw httpError(401, 'Credenciales inválidas');
  }

  // Login exitoso: resetea contador y migra hash bcrypt -> Argon2id.
  await usuarioModel.resetFailedAttempts(user.id);
  if (needsRehash) {
    try {
      const newHash = await hashPassword(password);
      await usuarioModel.updatePasswordHash(user.id, newHash);
    } catch {
      // El rehash es una optimizacion; no debe fallar el login.
    }
  }
  await audit({ email, usuarioId: user.id, success: true, motivo: 'login_ok', ctx });

  const token = signToken({ id: user.id, rol: user.rol, token_version: user.token_version || 0 });

  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    },
  };
}

async function bootstrapAdmin({ nombre, email, password, bootstrapSecret }) {
  if (!process.env.BOOTSTRAP_SECRET) throw httpError(500, 'BOOTSTRAP_SECRET is required');
  if (bootstrapSecret !== process.env.BOOTSTRAP_SECRET) throw httpError(403, 'Forbidden');

  const cnt = await usuarioModel.countUsuarios();
  if (cnt > 0) throw httpError(409, 'Bootstrap ya fue realizado');

  const password_hash = await hashPassword(password);
  const created = await usuarioModel.createUsuario({
    nombre,
    email,
    password_hash,
    rol: 'ADMIN',
  });

  return created;
}

async function me(userId) {
  const user = await usuarioModel.findById(userId);
  if (!user) throw httpError(404, 'Usuario no encontrado');
  if (!user.activo) throw httpError(403, 'Usuario inactivo');
  return user;
}

// Revoca todos los JWT del usuario incrementando token_version.
async function logout(userId) {
  await usuarioModel.incrementTokenVersion(userId);
  return { ok: true };
}

module.exports = { login, bootstrapAdmin, me, logout };
