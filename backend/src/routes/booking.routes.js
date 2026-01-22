const express = require('express');
const { body, query } = require('express-validator');
const { appAuth } = require('../middleware/appAuth');
const { userAuth } = require('../middleware/userAuth');
const { validate } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');
const bookingService = require('../services/bookingService');
const ApiResponse = require('../utils/response');
const Logger = require('../utils/logger');

const router = express.Router();

// All booking routes require app authentication
router.use(appAuth);

/**
 * GET /seats
 * List available seats for an entity
 * Requires: App auth + User auth
 */
router.get(
  '/seats',
  userAuth,
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
 * POST /reserve-seat
 * Reserve a seat (acquires lock)
 * Requires: App auth + User auth
 */
router.post(
  '/reserve-seat',
  userAuth,
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
 * POST /confirm-booking
 * Confirm booking after payment
 * Requires: App auth + User auth
 */
router.post(
  '/confirm-booking',
  userAuth,
  [
    body('reservationToken').notEmpty().withMessage('Reservation token is required'),
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { reservationToken, paymentId } = req.body;

    const booking = await bookingService.confirmBooking(
      req.app.appId,
      reservationToken,
      paymentId,
      req.user.id
    );

    Logger.info('Booking confirmed', {
      appId: req.app.appId,
      bookingId: booking.bookingId,
      userId: req.user.id
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
 * Requires: App auth + User auth
 */
router.post(
  '/release-seat',
  userAuth,
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
 * Requires: App auth + User auth
 */
router.get(
  '/my-bookings',
  userAuth,
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
 * Requires: App auth + User auth
 */
router.get(
  '/booking/:bookingId',
  userAuth,
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

module.exports = router;
