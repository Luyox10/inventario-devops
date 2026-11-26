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
    `SELECT id, nombre, email, password_hash, rol, activo,
            failed_attempts, locked_until, token_version,
            (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked,
            CEIL(TIMESTAMPDIFF(SECOND, NOW(), locked_until) / 60) AS lockout_minutes
     FROM usuarios WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, rol, activo, token_version FROM usuarios WHERE id = ? LIMIT 1',
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

// Incrementa el contador de intentos fallidos. Si supera maxAttempts,
// bloquea la cuenta por lockoutMinutes minutos (locked_until).
async function registerFailedAttempt(id, { maxAttempts, lockoutMinutes }) {
  const [result] = await pool.query(
    `UPDATE usuarios
     SET failed_attempts = failed_attempts + 1,
         locked_until = CASE
           WHEN failed_attempts + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
           ELSE locked_until
         END
     WHERE id = ?`,
    [maxAttempts, lockoutMinutes, id]
  );
  return result.affectedRows > 0;
}

// Resetea intentos fallidos tras login exitoso.
async function resetFailedAttempts(id) {
  const [result] = await pool.query(
    'UPDATE usuarios SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

// Incrementa token_version: revoca todos los JWT emitidos previamente.
async function incrementTokenVersion(id) {
  const [result] = await pool.query(
    'UPDATE usuarios SET token_version = token_version + 1 WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

// Registra un intento de login para auditoria.
async function insertLoginAttempt({ email, usuarioId, ip, userAgent, success, motivo }) {
  await pool.query(
    `INSERT INTO login_attempts (email, usuario_id, ip, user_agent, success, motivo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [email, usuarioId ?? null, ip ?? null, userAgent ?? null, success ? 1 : 0, motivo ?? null]
  );
}

module.exports = {
  countUsuarios,
  listUsuarios,
  findByEmail,
  findById,
  createUsuario,
  updateUsuario,
  updatePasswordHash,
  registerFailedAttempt,
  resetFailedAttempts,
  incrementTokenVersion,
  insertLoginAttempt,
};
