const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const User = require('../models/User');
const { validate } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');
const TokenService = require('../services/tokenService');
const ApiResponse = require('../utils/response');
const { AuthenticationError, ConflictError } = require('../utils/errors');

const router = express.Router();

/**
 * POST /auth/signup
 * User registration
 */
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { email, password, name, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      passwordHash,
      name,
      phone,
      isActive: true
    });

    await user.save();

    // Generate JWT token
    const token = TokenService.generateUserToken({
      userId: user._id.toString(),
      email: user.email
    });

    return ApiResponse.created(
      res,
      {
        token,
        user: user.toSafeObject()
      },
      'User registered successfully'
    );
  })
);

/**
 * POST /auth/login
 * User login
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate JWT token
    const token = TokenService.generateUserToken({
      userId: user._id.toString(),
      email: user.email
    });

    return ApiResponse.success(
      res,
      {
        token,
        user: user.toSafeObject()
      },
      'Login successful'
    );
  })
);

/**
 * POST /auth/verify
 * Verify if user token is valid
 */
router.post(
  '/verify',
  [
    body('token').notEmpty().withMessage('Token is required'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    try {
      const decoded = TokenService.verifyUserToken(token);
      
      // Verify user still exists
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid token');
      }

      return ApiResponse.success(
        res,
        {
          valid: true,
          user: user.toSafeObject()
        },
        'Token is valid'
      );
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  })
);

module.exports = router;
