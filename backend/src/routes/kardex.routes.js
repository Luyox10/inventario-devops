const express = require('express');
const { getKardex } = require('../controllers/kardex.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/:productoId', authMiddleware, roleMiddleware('ADMIN'), getKardex);

module.exports = router;
