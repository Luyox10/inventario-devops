const express = require('express');

const reporteController = require('../controllers/reporte.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/dashboard', authMiddleware, roleMiddleware('ADMIN'), reporteController.dashboard);

module.exports = router;
