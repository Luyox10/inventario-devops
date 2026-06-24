const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { health, train, simulate, predict, metrics } = require('../controllers/prediccion.controller');

const router = Router();

router.get('/health',   authMiddleware, roleMiddleware('ADMIN'), health);
router.post('/train',   authMiddleware, roleMiddleware('ADMIN'), train);
router.post('/simulate',authMiddleware, roleMiddleware('ADMIN'), simulate);
router.get('/predict',  authMiddleware, roleMiddleware('ADMIN'), predict);
router.get('/metrics',  authMiddleware, roleMiddleware('ADMIN'), metrics);

module.exports = router;
