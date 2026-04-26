const bcrypt = require('bcryptjs');

const usuarioModel = require('../models/usuario.model');
const { httpError } = require('../utils/httpError');

function normalizeRol(rol) {
  if (!rol) return null;
  const r = String(rol).toUpperCase();
  if (!['ADMIN', 'EMPLEADO'].includes(r)) return null;
  return r;
}

async function listUsuarios() {
  return usuarioModel.listUsuarios({ includeInactive: true });
}

async function createUsuario({ nombre, email, password, rol }) {
  const n = String(nombre || '').trim();
  const e = String(email || '').trim().toLowerCase();
  const r = normalizeRol(rol);

  if (!n || !e || !password || !r) throw httpError(400, 'Datos inválidos');

  const existing = await usuarioModel.findByEmail(e);
  if (existing) throw httpError(409, 'Email ya registrado');

  const password_hash = await bcrypt.hash(String(password), 10);
  return usuarioModel.createUsuario({ nombre: n, email: e, password_hash, rol: r });
}

async function updateUsuario(id, { nombre, email, rol, activo, password }) {
  const userId = Number(id);
  if (!userId) throw httpError(400, 'ID inválido');

  const existing = await usuarioModel.findById(userId);
  if (!existing) throw httpError(404, 'Usuario no encontrado');

  const patch = {};

  if (nombre !== undefined) {
    const n = String(nombre || '').trim();
    if (!n) throw httpError(400, 'Nombre inválido');
    patch.nombre = n;
  }

  if (email !== undefined) {
    const e = String(email || '').trim().toLowerCase();
    if (!e) throw httpError(400, 'Email inválido');

    const other = await usuarioModel.findByEmail(e);
    if (other && other.id !== userId) throw httpError(409, 'Email ya registrado');
    patch.email = e;
  }

  if (rol !== undefined) {
    const r = normalizeRol(rol);
    if (!r) throw httpError(400, 'Rol inválido');
    patch.rol = r;
  }

  if (activo !== undefined) {
    patch.activo = Number(Boolean(activo));
  }

  const ok = await usuarioModel.updateUsuario(userId, patch);
  if (!ok) throw httpError(500, 'No se pudo actualizar');

  if (password !== undefined && String(password).length > 0) {
    const password_hash = await bcrypt.hash(String(password), 10);
    await usuarioModel.updatePasswordHash(userId, password_hash);
  }

  return usuarioModel.findById(userId);
}

module.exports = { listUsuarios, createUsuario, updateUsuario };
