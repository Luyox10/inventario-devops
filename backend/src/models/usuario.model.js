const { pool } = require('../config/db');

async function countUsuarios() {
  const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM usuarios');
  return Number(rows[0].cnt || 0);
}

async function listUsuarios({ includeInactive = true } = {}) {
  const where = includeInactive ? '' : 'WHERE activo = 1';
  const [rows] = await pool.query(
    `SELECT id, nombre, email, rol, activo, created_at, updated_at
     FROM usuarios
     ${where}
     ORDER BY id DESC`
  );
  return rows;
}

async function findByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function createUsuario({ nombre, email, password_hash, rol }) {
  const [result] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, 1)',
    [nombre, email, password_hash, rol]
  );

  return {
    id: result.insertId,
    nombre,
    email,
    rol,
    activo: 1,
  };
}

async function updateUsuario(id, { nombre, email, rol, activo }) {
  const [result] = await pool.query(
    `UPDATE usuarios
     SET nombre = COALESCE(?, nombre),
         email = COALESCE(?, email),
         rol = COALESCE(?, rol),
         activo = COALESCE(?, activo)
     WHERE id = ?`,
    [nombre ?? null, email ?? null, rol ?? null, activo ?? null, id]
  );
  return result.affectedRows > 0;
}

async function updatePasswordHash(id, password_hash) {
  const [result] = await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [password_hash, id]);
  return result.affectedRows > 0;
}

module.exports = {
  countUsuarios,
  listUsuarios,
  findByEmail,
  findById,
  createUsuario,
  updateUsuario,
  updatePasswordHash,
};
