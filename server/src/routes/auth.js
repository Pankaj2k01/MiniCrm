const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, optionalAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Public routes (no authentication required)
router.post('/login', strictAuthLimiter, authController.loginValidation, authController.login);
router.post('/register', authLimiter, authController.registerValidation, authController.register);
router.post('/refresh-token', authLimiter, authController.refreshToken);

// Protected routes (authentication required)
router.post('/logout', optionalAuth, authController.logout);
router.get('/profile', authenticate, authController.getProfile);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;