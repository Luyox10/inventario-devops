const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { health, train, predict } = require('../controllers/prediccion.controller');

const router = Router();

router.get('/health',  authMiddleware, roleMiddleware('ADMIN'), health);
router.post('/train',  authMiddleware, roleMiddleware('ADMIN'), train);
router.get('/predict', authMiddleware, roleMiddleware('ADMIN'), predict);

module.exports = router;
