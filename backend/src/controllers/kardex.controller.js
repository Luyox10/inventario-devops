const kardexService = require('../services/kardex.service');

async function getKardex(req, res, next) {
  try {
    const productoId = Number(req.params.productoId);
    if (!productoId || productoId <= 0) {
      return res.status(400).json({ error: 'producto_id inválido' });
    }
    const { desde, hasta } = req.query;
    const data = await kardexService.getKardex({ productoId, desde, hasta });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getKardex };
