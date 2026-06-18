const express = require('express');

const loteController = require('../controllers/lote.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/producto/:productoId', authMiddleware, roleMiddleware('ADMIN'), loteController.getLotesByProducto);
router.put('/:loteId', authMiddleware, roleMiddleware('ADMIN'), loteController.updateLoteExpiry);
router.delete('/:loteId', authMiddleware, roleMiddleware('ADMIN'), loteController.darDeBajaLote);
router.patch('/:loteId/ajuste', authMiddleware, roleMiddleware('ADMIN'), loteController.ajustarLote);

module.exports = router;
