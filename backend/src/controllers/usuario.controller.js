const usuarioService = require('../services/usuario.service');

async function list(req, res, next) {
  try {
    const rows = await usuarioService.listUsuarios();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { nombre, email, password, rol } = req.body || {};
    const user = await usuarioService.createUsuario({ nombre, email, password, rol });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { nombre, email, rol, activo, password } = req.body || {};
    const user = await usuarioService.updateUsuario(id, { nombre, email, rol, activo, password });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update };
