const express = require('express');

const productoController = require('../controllers/producto.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', authMiddleware, productoController.list);
router.get('/:id', authMiddleware, productoController.getById);

router.post('/', authMiddleware, roleMiddleware('ADMIN'), productoController.create);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), productoController.update);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), productoController.remove);

module.exports = router;
