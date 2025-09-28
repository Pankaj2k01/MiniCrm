const jwt = require('jsonwebtoken');
const config = require('../config');
const database = require('../models/database');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Get user from database
      const user = await database.get(
        'SELECT id, name, email, role, teamId, department, phone, isActive FROM users WHERE id = ? AND isActive = 1',
        [decoded.userId]
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Optional authentication (for endpoints that work with or without auth)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await database.get(
      'SELECT id, name, email, role, teamId, department, phone, isActive FROM users WHERE id = ? AND isActive = 1',
      [decoded.userId]
    );

    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
    console.log('Optional auth failed:', error.message);
  }
  
  next();
};

module.exports = {
  authenticate,
  optionalAuth
};