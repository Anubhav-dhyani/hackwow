const express = require('express');
const { body, query } = require('express-validator');
const { appAuth } = require('../middleware/appAuth');
const { externalUserAuth } = require('../middleware/userAuth');
const { validate } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');
const bookingService = require('../services/bookingService');
const razorpayService = require('../services/razorpayService');
const ApiResponse = require('../utils/response');
const Logger = require('../utils/logger');

const router = express.Router();

// All booking routes require app authentication
router.use(appAuth);

/**
 * GET /seats
 * List available seats for an entity
 * Requires: App auth + User auth (supports external users)
 */
router.get(
  '/seats',
  externalUserAuth,
  [
    query('entityId').notEmpty().withMessage('Entity ID is required'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be >= 0'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be >= 0'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { entityId, minPrice, maxPrice } = req.query;

    const filters = {};
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);

    const seats = await bookingService.getAvailableSeats(
      req.app.appId,
      entityId,
      filters
    );

    Logger.info('Seats fetched', {
      appId: req.app.appId,
      entityId,
      count: seats.length,
      userId: req.user.id
    });

    return ApiResponse.success(res, {
      seats,
      count: seats.length,
      entityId
    });
  })
);

/**
 * GET /seats/status
 * Get all seats with lock status (for displaying reserved/locked seats)
 * Requires: App auth + User auth (supports external users)
 */
router.get(
  '/seats/status',
  externalUserAuth,
  [
    query('entityId').notEmpty().withMessage('Entity ID is required'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { entityId } = req.query;

    const seats = await bookingService.getAllSeatsWithLockStatus(
      req.app.appId,
      entityId
    );

    Logger.info('Seat status fetched', {
      appId: req.app.appId,
      entityId,
      count: seats.length,
      userId: req.user.id
    });

    return ApiResponse.success(res, {
      seats,
      count: seats.length,
      entityId
    });
  })
);

/**
 * POST /reserve-seat
 * Reserve a seat (acquires lock)
 * Requires: App auth + User auth (supports external users)
 */
router.post(
  '/reserve-seat',
  externalUserAuth,
  [
    body('seatId').notEmpty().withMessage('Seat ID is required'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { seatId } = req.body;

    const reservation = await bookingService.reserveSeat(
      req.app.appId,
      seatId,
      req.user.id
    );

    Logger.info('Seat reserved', {
      appId: req.app.appId,
      seatId,
      userId: req.user.id,
      reservationToken: reservation.reservationToken
    });

    return ApiResponse.success(
      res,
      reservation,
      'Seat reserved successfully. Complete payment within 2 minutes.'
    );
  })
);

/**
 * POST /create-order
 * Create Razorpay order for payment
 * Requires: App auth + User auth (supports external users)
 * 
 * This is an IDEMPOTENT operation - same reservationToken returns same order
 */
router.post(
  '/create-order',
  externalUserAuth,
  [
    body('reservationToken').notEmpty().withMessage('Reservation token is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be > 0'),
    body('currency').optional().isIn(['INR', 'USD']).withMessage('Invalid currency'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { reservationToken, amount, currency = 'INR', metadata = {} } = req.body;

    // Verify reservation is valid before creating order
    const Reservation = require('../models/Reservation');
    const reservation = await Reservation.findOne({ 
      reservationToken,
      userId: req.user.id,
      status: 'ACTIVE'
    });

    if (!reservation) {
      return ApiResponse.error(res, 'Invalid or expired reservation', 400);
    }

    // Create Razorpay order (idempotent - same token returns same order)
    const order = await razorpayService.createOrder({
      reservationToken,
      amount,
      currency,
      notes: {
        userId: req.user.id,
        appId: req.app.appId,
        seatId: reservation.seatId.toString(),
        ...metadata
      }
    });

    Logger.info('Razorpay order created', {
      appId: req.app.appId,
      orderId: order.id,
      reservationToken,
      userId: req.user.id
    });

    return ApiResponse.success(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      reservationToken,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_simulated'
    }, 'Order created successfully');
  })
);

/**
 * POST /confirm-booking
 * Confirm booking after payment
 * Requires: App auth + User auth (supports external users)
 * 
 * Supports both:
 * 1. Simple paymentId (legacy/simulation)
 * 2. Full Razorpay verification (razorpay_order_id, razorpay_payment_id, razorpay_signature)
 */
router.post(
  '/confirm-booking',
  externalUserAuth,
  [
    body('reservationToken').notEmpty().withMessage('Reservation token is required'),
    // Support both legacy paymentId and Razorpay fields
    body('paymentId').optional(),
    body('razorpay_order_id').optional(),
    body('razorpay_payment_id').optional(),
    body('razorpay_signature').optional(),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { 
      reservationToken, 
      paymentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature 
    } = req.body;

    let verifiedPaymentId = paymentId;

    // If Razorpay fields are provided, verify signature first
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      try {
        Logger.info('Verifying Razorpay payment', {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature.substring(0, 20) + '...'
        });

        const verification = razorpayService.verifyPaymentSignature({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        });

        if (!verification.verified) {
          Logger.error('Payment verification failed - not verified');
          return ApiResponse.error(res, 'Payment verification failed', 400);
        }

        verifiedPaymentId = razorpay_payment_id;

        Logger.info('Razorpay payment verified successfully', {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id
        });
      } catch (verifyError) {
        Logger.error('Payment verification error', {
          error: verifyError.message,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id
        });
        return ApiResponse.error(res, `Payment verification failed: ${verifyError.message}`, 400);
      }
    }

    if (!verifiedPaymentId) {
      return ApiResponse.error(res, 'Payment ID is required', 400);
    }

    const booking = await bookingService.confirmBooking(
      req.app.appId,
      reservationToken,
      verifiedPaymentId,
      req.user.id
    );

    Logger.info('Booking confirmed', {
      appId: req.app.appId,
      bookingId: booking.bookingId,
      userId: req.user.id,
      paymentId: verifiedPaymentId
    });

    return ApiResponse.success(
      res,
      booking,
      'Booking confirmed successfully'
    );
  })
);

/**
 * POST /release-seat
 * Release seat reservation (cancel)
 * Requires: App auth + User auth (supports external users)
 */
router.post(
  '/release-seat',
  externalUserAuth,
  [
    body('reservationToken').notEmpty().withMessage('Reservation token is required'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { reservationToken } = req.body;

    await bookingService.releaseSeat(reservationToken, req.user.id);

    Logger.info('Seat released', {
      appId: req.app.appId,
      reservationToken,
      userId: req.user.id
    });

    return ApiResponse.success(res, null, 'Seat released successfully');
  })
);

/**
 * GET /my-bookings
 * Get user's bookings
 * Requires: App auth + User auth (supports external users)
 */
router.get(
  '/my-bookings',
  externalUserAuth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const bookings = await bookingService.getUserBookings(req.user.id, {
      limit: parseInt(limit),
      skip: (page - 1) * limit,
      appId: req.app.appId
    });

    return ApiResponse.success(res, {
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        count: bookings.length
      }
    });
  })
);

/**
 * GET /booking/:bookingId
 * Get booking details
 * Requires: App auth + User auth (supports external users)
 */
router.get(
  '/booking/:bookingId',
  externalUserAuth,
  asyncHandler(async (req, res) => {
    const { bookingId } = req.params;

    const booking = await require('../models/Booking')
      .findOne({ bookingId, userId: req.user.id })
      .populate('seatId', 'seatNumber entityId price domain')
      .lean();

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking');
    }

    return ApiResponse.success(res, { booking });
  })
);

/**
 * POST /webhook/razorpay
 * Handle Razorpay webhooks (payment.captured, payment.failed, etc.)
 * NO AUTH REQUIRED - Verified via signature
 */
router.post(
  '/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const payload = req.body;

    try {
      const { verified, event, payload: webhookPayload } = razorpayService.verifyWebhook(
        payload,
        signature
      );

      if (!verified) {
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }

      Logger.info('Razorpay webhook received', { event });

      // Handle different events
      switch (event) {
        case 'payment.captured':
          // Payment successful - could auto-confirm booking here
          Logger.info('Payment captured via webhook', {
            paymentId: webhookPayload.payload?.payment?.entity?.id,
            orderId: webhookPayload.payload?.payment?.entity?.order_id
          });
          break;

        case 'payment.failed':
          Logger.warn('Payment failed via webhook', {
            paymentId: webhookPayload.payload?.payment?.entity?.id,
            error: webhookPayload.payload?.payment?.entity?.error_description
          });
          break;

        case 'refund.processed':
          Logger.info('Refund processed via webhook', {
            refundId: webhookPayload.payload?.refund?.entity?.id
          });
          break;

        default:
          Logger.info('Unhandled webhook event', { event });
      }

      // Always respond 200 to acknowledge receipt
      return res.status(200).json({ success: true, received: true });

    } catch (error) {
      Logger.error('Webhook processing failed', { error: error.message });
      return res.status(400).json({ success: false, message: error.message });
    }
  })
);

module.exports = router;
