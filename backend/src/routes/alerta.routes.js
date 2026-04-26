const express = require('express');

const alertaController = require('../controllers/alerta.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/stock-bajo', authMiddleware, alertaController.stockBajo);

module.exports = router;
