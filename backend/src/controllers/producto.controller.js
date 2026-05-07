const productoService = require('../services/producto.service');

function logProductoControllerError(action, err) {
  const code = err && err.code ? ` code=${err.code}` : '';
  const errno = err && err.errno != null ? ` errno=${err.errno}` : '';
  const state = err && err.sqlState ? ` sqlState=${err.sqlState}` : '';
  const message = err && err.message ? err.message : 'Unknown error';
  process.stderr.write(`[producto.controller:${action}] ${message}${code}${errno}${state}\n`);
  if (err && err.sqlMessage) process.stderr.write(`[producto.controller:${action}] sqlMessage=${err.sqlMessage}\n`);
}

async function list(req, res, next) {
  try {
    const rows = await productoService.list();
    res.json(rows);
  } catch (err) {
    logProductoControllerError('list', err);
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await productoService.getById(Number(req.params.id));
    res.json(row);
  } catch (err) {
    logProductoControllerError('getById', err);
    next(err);
  }
}

async function create(req, res, next) {
  try {
    process.stderr.write(`[producto.controller:create] payload=${JSON.stringify(req.body || {})}\n`);
    const created = await productoService.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    logProductoControllerError('create', err);
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const updated = await productoService.update(Number(req.params.id), req.body);
    res.json(updated);
  } catch (err) {
    logProductoControllerError('update', err);
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const removed = await productoService.remove(Number(req.params.id));
    res.json(removed);
  } catch (err) {
    logProductoControllerError('remove', err);
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
