const bcrypt = require('bcryptjs');

const usuarioModel = require('../models/usuario.model');
const { httpError } = require('../utils/httpError');
const { signToken } = require('../utils/jwt');

async function login({ email, password }) {
  const user = await usuarioModel.findByEmail(email);
  if (!user) throw httpError(401, 'Credenciales inválidas');
  if (!user.activo) throw httpError(403, 'Usuario inactivo');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw httpError(401, 'Credenciales inválidas');

  const token = signToken({ id: user.id, rol: user.rol });

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

  const password_hash = await bcrypt.hash(password, 10);
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

module.exports = { login, bootstrapAdmin, me };
