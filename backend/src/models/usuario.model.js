const { pool } = require('../config/db');

async function countUsuarios() {
  const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM usuarios');
  return Number(rows[0].cnt || 0);
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

module.exports = {
  countUsuarios,
  findByEmail,
  findById,
  createUsuario,
};
