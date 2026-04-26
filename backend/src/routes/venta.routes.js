const express = require('express');

const ventaController = require('../controllers/venta.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = express.Router();

router.post('/', authMiddleware, ventaController.crearVenta);
router.get('/', authMiddleware, roleMiddleware('ADMIN'), ventaController.listVentas);

module.exports = router;
