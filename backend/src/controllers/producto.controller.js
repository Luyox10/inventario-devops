const productoService = require('../services/producto.service');

async function list(req, res, next) {
  try {
    const rows = await productoService.list();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await productoService.getById(Number(req.params.id));
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const created = await productoService.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const updated = await productoService.update(Number(req.params.id), req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const removed = await productoService.remove(Number(req.params.id));
    res.json(removed);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
