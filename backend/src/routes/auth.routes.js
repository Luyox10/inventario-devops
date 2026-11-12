const express = require('express');
const { rateLimit } = require('express-rate-limit');

const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Fuerza bruta: máximo 5 intentos fallidos por IP cada 15 minutos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
});

router.post('/login', loginLimiter, authController.login);
router.post('/bootstrap-admin', loginLimiter, authController.bootstrapAdmin);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
