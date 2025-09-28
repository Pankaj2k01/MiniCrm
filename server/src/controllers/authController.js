const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const config = require('../config');
const database = require('../models/database');
const { logActivity } = require('../utils/logger');

// Generate JWT tokens
const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  });

  return { accessToken, refreshToken };
};

// Store refresh token in database
const storeRefreshToken = async (userId, refreshToken) => {
  const tokenId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  await database.run(
    'INSERT INTO refresh_tokens (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)',
    [tokenId, userId, refreshToken, expiresAt]
  );

  // Clean up expired tokens
  await database.run(
    'DELETE FROM refresh_tokens WHERE expiresAt < ?',
    [new Date().toISOString()]
  );
};

// Remove refresh token from database
const removeRefreshToken = async (token) => {
  await database.run('DELETE FROM refresh_tokens WHERE token = ?', [token]);
};

// Check if user is locked due to failed login attempts
const isAccountLocked = (user) => {
  return user.lockUntil && user.lockUntil > Date.now();
};

// Increment login attempts
const incrementLoginAttempts = async (userId) => {
  const user = await database.get('SELECT loginAttempts FROM users WHERE id = ?', [userId]);
  const attempts = (user.loginAttempts || 0) + 1;
  
  let lockUntil = null;
  if (attempts >= config.security.maxLoginAttempts) {
    lockUntil = Date.now() + config.security.lockTime;
  }

  await database.run(
    'UPDATE users SET loginAttempts = ?, lockUntil = ? WHERE id = ?',
    [attempts, lockUntil, userId]
  );
};

// Reset login attempts
const resetLoginAttempts = async (userId) => {
  await database.run(
    'UPDATE users SET loginAttempts = 0, lockUntil = NULL WHERE id = ?',
    [userId]
  );
};

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const registerValidation = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
  body('department').optional().trim()
];

// Login endpoint
const login = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await database.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await incrementLoginAttempts(user.id);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    await resetLoginAttempts(user.id);

    // Update last login time
    await database.run(
      'UPDATE users SET lastLoginAt = ? WHERE id = ?',
      [new Date().toISOString(), user.id]
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user.id, refreshToken);

    // Log activity
    await logActivity({
      type: 'login',
      resourceType: 'user',
      resourceId: user.id,
      description: 'User logged in',
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return user data without password
    const { password: _, loginAttempts, lockUntil, ...userWithoutSensitiveData } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutSensitiveData,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Register endpoint
const register = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, password, phone, department } = req.body;

    // Check if user already exists
    const existingUser = await database.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();

    await database.run(
      `INSERT INTO users (id, name, email, password, phone, department, role, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'sales_rep', 1, ?, ?)`,
      [userId, name, email, hashedPassword, phone || null, department || null, now, now]
    );

    // Get created user
    const user = await database.get(
      'SELECT id, name, email, role, phone, department, isActive, createdAt FROM users WHERE id = ?',
      [userId]
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user.id, refreshToken);

    // Log activity
    await logActivity({
      type: 'create',
      resourceType: 'user',
      resourceId: user.id,
      description: 'User registered',
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Refresh token endpoint
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in database
    const storedToken = await database.get(
      'SELECT * FROM refresh_tokens WHERE token = ? AND userId = ? AND expiresAt > ?',
      [refreshToken, decoded.userId, new Date().toISOString()]
    );

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Get user
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

    // Generate new tokens
    const tokens = generateTokens(user);
    
    // Remove old refresh token and store new one
    await removeRefreshToken(refreshToken);
    await storeRefreshToken(user.id, tokens.refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Logout endpoint
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await removeRefreshToken(refreshToken);
    }

    // Log activity
    if (req.user) {
      await logActivity({
        type: 'logout',
        resourceType: 'user',
        resourceId: req.user.id,
        description: 'User logged out',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const { password, loginAttempts, lockUntil, ...userProfile } = req.user;
    
    res.json({
      success: true,
      data: userProfile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  getProfile,
  loginValidation,
  registerValidation
};