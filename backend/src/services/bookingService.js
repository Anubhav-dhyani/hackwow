const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');
const Booking = require('../models/Booking');
const lockService = require('./lockService');
const paymentService = require('./paymentService');
const { NotFoundError, SeatLockError, ConflictError, PaymentError } = require('../utils/errors');
const Logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Booking Service (Core Business Logic)
 * 
 * Handles the complete booking flow:
 * 1. Seat availability checking
 * 2. Seat reservation (with Redis lock)
 * 3. Payment processing
 * 4. Booking confirmation
 * 5. Lock release
 */
class BookingService {
  /**
   * Get available seats for an entity
   * @param {String} appId - App ID
   * @param {String} entityId - Entity ID (event, bus, movie show)
   * @param {Object} filters - Optional filters
   * @returns {Array<Seat>} Available seats
   */
  async getAvailableSeats(appId, entityId, filters = {}) {
    const query = {
      appId,
      entityId,
      status: 'AVAILABLE'
    };

    // Apply additional filters
    if (filters.minPrice !== undefined) {
      query.price = { ...query.price, $gte: filters.minPrice };
    }
    if (filters.maxPrice !== undefined) {
      query.price = { ...query.price, $lte: filters.maxPrice };
    }

    const seats = await Seat.find(query).sort({ seatNumber: 1 }).lean();

    // Filter out seats that are locked in Redis
    const seatIds = seats.map(seat => seat._id.toString());
    const lockStatus = await lockService.bulkCheckLocks(seatIds);

    const availableSeats = seats.filter(seat => !lockStatus[seat._id.toString()]);

    Logger.debug('Available seats fetched', {
      appId,
      entityId,
      total: seats.length,
      available: availableSeats.length,
      locked: seats.length - availableSeats.length
    });

    return availableSeats;
  }

  /**
   * Reserve a seat (Step 1 of booking)
   * @param {String} appId - App ID
   * @param {String} seatId - Seat ID
   * @param {String} userId - User ID
   * @returns {Object} Reservation details
   */
  async reserveSeat(appId, seatId, userId) {
    // Validate seat exists and is available
    const seat = await Seat.findById(seatId);

    if (!seat) {
      throw new NotFoundError('Seat');
    }

    if (seat.appId !== appId) {
      throw new ConflictError('Seat does not belong to this app');
    }

    if (seat.status !== 'AVAILABLE') {
      throw new ConflictError('Seat is not available');
    }

    // Acquire lock in Redis (ATOMIC operation)
    const lockDetails = await lockService.acquireLock(seatId, userId);

    // Create reservation record in MongoDB
    const reservation = new Reservation({
      reservationToken: lockDetails.reservationToken,
      userId,
      appId,
      seatId,
      status: 'ACTIVE',
      expiresAt: new Date(lockDetails.expiresAt),
      metadata: {
        seatNumber: seat.seatNumber,
        price: seat.price,
        entityId: seat.entityId
      }
    });

    await reservation.save();

    Logger.info('Seat reserved successfully', {
      appId,
      seatId,
      userId,
      reservationToken: lockDetails.reservationToken
    });

    return {
      reservationToken: lockDetails.reservationToken,
      expiresAt: lockDetails.expiresAt,
      seat: {
        id: seat._id,
        seatNumber: seat.seatNumber,
        price: seat.price,
        entityId: seat.entityId
      },
      ttl: lockDetails.ttl
    };
  }

  /**
   * Confirm booking (Step 2 of booking - after payment)
   * @param {String} appId - App ID
   * @param {String} reservationToken - Reservation token
   * @param {String} paymentId - Payment ID from payment gateway
   * @param {String} userId - User ID
   * @returns {Object} Booking details
   */
  async confirmBooking(appId, reservationToken, paymentId, userId) {
    // Find reservation
    const reservation = await Reservation.findOne({ reservationToken });

    if (!reservation) {
      throw new NotFoundError('Reservation');
    }

    // Validate reservation belongs to user
    if (reservation.userId.toString() !== userId) {
      throw new ConflictError('Reservation does not belong to this user');
    }

    // Validate reservation is active
    if (reservation.status !== 'ACTIVE') {
      throw new ConflictError(`Reservation is ${reservation.status.toLowerCase()}`);
    }

    // Check if reservation expired
    if (reservation.isExpired()) {
      reservation.status = 'EXPIRED';
      await reservation.save();
      await lockService.releaseLock(reservation.seatId.toString());
      throw new ConflictError('Reservation has expired');
    }

    // Verify lock in Redis
    const isLockValid = await lockService.verifyLock(
      reservation.seatId.toString(),
      reservationToken,
      userId
    );

    if (!isLockValid) {
      throw new SeatLockError('Reservation lock is no longer valid');
    }

    // Get seat details
    const seat = await Seat.findById(reservation.seatId);

    if (!seat || seat.status !== 'AVAILABLE') {
      throw new ConflictError('Seat is no longer available');
    }

    // Verify payment
    await paymentService.verifyPayment(paymentId);

    // START TRANSACTION (MongoDB transaction for consistency)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update seat status to BOOKED
      const bookingId = Booking.generateBookingId();

      seat.status = 'BOOKED';
      seat.bookedBy = userId;
      seat.bookingId = null; // Will be set after booking is created
      await seat.save({ session });

      // Create booking document
      const booking = new Booking({
        bookingId,
        userId,
        appId,
        seatId: seat._id,
        reservationToken,
        paymentStatus: 'SUCCESS',
        paymentId,
        amount: seat.price,
        currency: 'USD',
        bookingDate: new Date(),
        metadata: {
          seatNumber: seat.seatNumber,
          entityId: seat.entityId,
          domain: seat.domain
        }
      });

      await booking.save({ session });

      // Update seat with booking reference
      seat.bookingId = booking._id;
      await seat.save({ session });

      // Update reservation status
      reservation.status = 'CONFIRMED';
      await reservation.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Release lock in Redis
      await lockService.releaseLock(seat._id.toString(), reservationToken);

      Logger.info('Booking confirmed successfully', {
        bookingId,
        userId,
        seatId: seat._id.toString(),
        amount: seat.price
      });

      return {
        bookingId,
        booking: booking.toObject(),
        seat: {
          id: seat._id,
          seatNumber: seat.seatNumber,
          entityId: seat.entityId
        }
      };

    } catch (error) {
      await session.abortTransaction();
      Logger.error('Booking confirmation failed', {
        error: error.message,
        reservationToken
      });
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release seat reservation (cancel)
   * @param {String} reservationToken - Reservation token
   * @param {String} userId - User ID
   * @returns {Boolean} Success
   */
  async releaseSeat(reservationToken, userId) {
    const reservation = await Reservation.findOne({ reservationToken });

    if (!reservation) {
      throw new NotFoundError('Reservation');
    }

    if (reservation.userId.toString() !== userId) {
      throw new ConflictError('Reservation does not belong to this user');
    }

    if (reservation.status === 'CONFIRMED') {
      throw new ConflictError('Cannot release confirmed booking');
    }

    // Release lock in Redis
    await lockService.releaseLock(reservation.seatId.toString(), reservationToken);

    // Update reservation status
    reservation.status = 'RELEASED';
    await reservation.save();

    Logger.info('Seat released successfully', {
      reservationToken,
      userId,
      seatId: reservation.seatId.toString()
    });

    return true;
  }

  /**
   * Get user bookings
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array<Booking>} User bookings
   */
  async getUserBookings(userId, options = {}) {
    const { limit = 10, skip = 0, appId } = options;

    const query = { userId };
    if (appId) {
      query.appId = appId;
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('seatId', 'seatNumber entityId price')
      .lean();

    return bookings;
  }
}

module.exports = new BookingService();
