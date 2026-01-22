const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const App = require('../models/App');
const Booking = require('../models/Booking');
const { adminAuth, adminLogin } = require('../middleware/adminAuth');
const { validate } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiResponse = require('../utils/response');
const { ConflictError } = require('../utils/errors');

const router = express.Router();

/**
 * POST /admin/login
 * Admin login endpoint
 */
router.post(
  '/login',
  [
    body('username').optional().trim(),
    body('email').optional().isEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    
    // Accept either email or username
    const identifier = email || username;
    if (!identifier) {
      throw new ValidationError('Email or username is required');
    }

    const token = await adminLogin(identifier, password);

    return ApiResponse.success(res, { 
      token,
      admin: { username: identifier }
    }, 'Admin logged in successfully');
  })
);

/**
 * POST /admin/apps
 * Create a new app (frontend tenant)
 */
router.post(
  '/apps',
  adminAuth,
  [
    body('appId').trim().notEmpty().withMessage('App ID is required'),
    body('name').trim().notEmpty().withMessage('App name is required'),
    body('domain').isIn(['EVENT', 'BUS', 'MOVIE']).withMessage('Valid domain is required'),
    body('apiKey').isLength({ min: 32 }).withMessage('API key must be at least 32 characters'),
    body('allowedDomains').isArray().withMessage('Allowed domains must be an array'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { appId, name, domain, apiKey, allowedDomains, metadata } = req.body;

    // Check if app already exists
    const existingApp = await App.findOne({ appId });
    if (existingApp) {
      throw new ConflictError('App ID already exists');
    }

    // Hash API key
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    // Create app
    const app = new App({
      appId,
      apiKeyHash,
      name,
      domain,
      allowedDomains,
      isActive: true,
      metadata: metadata || {},
      createdBy: req.admin.email
    });

    await app.save();

    return ApiResponse.created(
      res,
      {
        app: app.toSafeObject(),
        apiKey // Return API key only once (never stored in plain text)
      },
      'App created successfully'
    );
  })
);

/**
 * GET /admin/apps
 * List all apps
 */
router.get(
  '/apps',
  adminAuth,
  asyncHandler(async (req, res) => {
    const { domain, isActive, page = 1, limit = 20 } = req.query;

    const query = {};
    if (domain) query.domain = domain;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const apps = await App.find(query)
      .select('-apiKeyHash')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await App.countDocuments(query);

    return ApiResponse.success(res, {
      apps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

/**
 * GET /admin/apps/:appId
 * Get app details
 */
router.get(
  '/apps/:appId',
  adminAuth,
  asyncHandler(async (req, res) => {
    const { appId } = req.params;

    const app = await App.findOne({ appId }).select('-apiKeyHash');

    if (!app) {
      return ApiResponse.notFound(res, 'App');
    }

    return ApiResponse.success(res, { app });
  })
);

/**
 * PATCH /admin/apps/:appId
 * Update app
 */
router.patch(
  '/apps/:appId',
  adminAuth,
  asyncHandler(async (req, res) => {
    const { appId } = req.params;
    const { name, allowedDomains, isActive, metadata } = req.body;

    const app = await App.findOne({ appId });

    if (!app) {
      return ApiResponse.notFound(res, 'App');
    }

    // Update allowed fields
    if (name) app.name = name;
    if (allowedDomains) app.allowedDomains = allowedDomains;
    if (isActive !== undefined) app.isActive = isActive;
    if (metadata) app.metadata = { ...app.metadata, ...metadata };

    await app.save();

    return ApiResponse.success(res, { app: app.toSafeObject() }, 'App updated successfully');
  })
);

/**
 * GET /admin/bookings
 * View all bookings (admin analytics)
 */
router.get(
  '/bookings',
  adminAuth,
  asyncHandler(async (req, res) => {
    const { appId, domain, paymentStatus, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};
    if (appId) query.appId = appId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    if (startDate || endDate) {
      query.bookingDate = {};
      if (startDate) query.bookingDate.$gte = new Date(startDate);
      if (endDate) query.bookingDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate('userId', 'name email')
      .populate('seatId', 'seatNumber entityId price')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Booking.countDocuments(query);

    // Calculate statistics
    const stats = await Booking.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalBookings: { $sum: 1 }
        }
      }
    ]);

    return ApiResponse.success(res, {
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: stats[0] || { totalRevenue: 0, totalBookings: 0 }
    });
  })
);

/**
 * POST /admin/apps/:appId/rotate-key
 * Rotate API key for an app
 */
router.post(
  '/apps/:appId/rotate-key',
  adminAuth,
  [
    body('newApiKey').isLength({ min: 32 }).withMessage('New API key must be at least 32 characters'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { appId } = req.params;
    const { newApiKey } = req.body;

    const app = await App.findOne({ appId });

    if (!app) {
      return ApiResponse.notFound(res, 'App');
    }

    // Hash new API key
    app.apiKeyHash = await bcrypt.hash(newApiKey, 10);
    await app.save();

    return ApiResponse.success(
      res,
      {
        appId: app.appId,
        newApiKey // Return only once
      },
      'API key rotated successfully'
    );
  })
);

module.exports = router;
