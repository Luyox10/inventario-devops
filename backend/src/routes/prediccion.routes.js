const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { health, predict } = require('../controllers/prediccion.controller');

const router = Router();

router.get('/health', authMiddleware, roleMiddleware('ADMIN'), health);
router.get('/predict', authMiddleware, roleMiddleware('ADMIN'), predict);

module.exports = router;
