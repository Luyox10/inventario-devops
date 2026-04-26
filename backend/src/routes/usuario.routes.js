const express = require('express');

const usuarioController = require('../controllers/usuario.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN'), usuarioController.list);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), usuarioController.create);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), usuarioController.update);

module.exports = router;
