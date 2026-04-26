const express = require('express');

const stockController = require('../controllers/stock.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = express.Router();

router.put('/:productoId', authMiddleware, stockController.updateCantidad);
router.put('/:productoId/minimo', authMiddleware, roleMiddleware('ADMIN'), stockController.updateMinimo);

module.exports = router;
