const { v4: uuidv4 } = require('uuid');
const redisConnection = require('../config/redis');
const env = require('../config/env');
const { SeatLockError } = require('../utils/errors');
const Logger = require('../utils/logger');

/**
 * Redis Lock Service (CRITICAL for Race Condition Prevention)
 * 
 * Implements atomic seat locking with TTL using Redis
 * Prevents double-booking in high-concurrency scenarios
 */
class LockService {
  constructor() {
    this.redis = null;
    this.ttl = env.LOCK_TTL_SECONDS;
  }

  /**
   * Initialize Redis client
   */
  async init() {
    if (!this.redis) {
      this.redis = redisConnection.getClient();
    }
  }

  /**
   * Generate lock key for a seat
   * @param {String} seatId - Seat ID
   * @returns {String} Redis key
   */
  getLockKey(seatId) {
    return `seat:lock:${seatId}`;
  }

  /**
   * Acquire lock on a seat (ATOMIC)
   * @param {String} seatId - Seat ID
   * @param {String} userId - User ID
   * @returns {Object} Lock details { reservationToken, expiresAt }
   * @throws {SeatLockError} If seat is already locked
   */
  async acquireLock(seatId, userId) {
    await this.init();

    const key = this.getLockKey(seatId);
    const reservationToken = uuidv4();
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + this.ttl * 1000);

    const lockData = JSON.stringify({
      reservationToken,
      userId,
      timestamp,
      expiresAt: expiresAt.toISOString()
    });

    try {
      // ATOMIC OPERATION: SET if Not eXists with EXpiry
      // This is the KEY to preventing race conditions
      const result = await this.redis.set(
        key,
        lockData,
        {
          NX: true,  // Only set if key doesn't exist
          EX: this.ttl  // Set expiry in seconds
        }
      );

      // result will be 'OK' if lock acquired, null if already exists
      if (result === null) {
        // Lock already exists, fetch current lock details
        const existingLock = await this.getLock(seatId);
        
        Logger.warn('Seat lock acquisition failed', {
          seatId,
          userId,
          existingLock
        });

        throw new SeatLockError('Seat is already locked by another user', {
          seatId,
          expiresIn: existingLock ? this.calculateRemainingTime(existingLock.expiresAt) : null
        });
      }

      Logger.info('Seat lock acquired', {
        seatId,
        userId,
        reservationToken,
        expiresAt: expiresAt.toISOString()
      });

      return {
        reservationToken,
        expiresAt: expiresAt.toISOString(),
        ttl: this.ttl
      };

    } catch (error) {
      if (error instanceof SeatLockError) {
        throw error;
      }
      Logger.error('Error acquiring lock', { seatId, userId, error: error.message });
      throw new Error('Failed to acquire seat lock');
    }
  }

  /**
   * Get existing lock for a seat
   * @param {String} seatId - Seat ID
   * @returns {Object|null} Lock data or null
   */
  async getLock(seatId) {
    await this.init();

    const key = this.getLockKey(seatId);
    const lockData = await this.redis.get(key);

    if (!lockData) {
      return null;
    }

    try {
      return JSON.parse(lockData);
    } catch (error) {
      Logger.error('Error parsing lock data', { seatId, error: error.message });
      return null;
    }
  }

  /**
   * Verify lock ownership and validity
   * @param {String} seatId - Seat ID
   * @param {String} reservationToken - Reservation token
   * @param {String} userId - User ID
   * @returns {Boolean} True if lock is valid
   */
  async verifyLock(seatId, reservationToken, userId) {
    const lock = await this.getLock(seatId);

    if (!lock) {
      return false;
    }

    // Verify token and user match
    const isValid = 
      lock.reservationToken === reservationToken &&
      lock.userId === userId &&
      new Date(lock.expiresAt) > new Date();

    return isValid;
  }

  /**
   * Release lock (manual unlock)
   * @param {String} seatId - Seat ID
   * @param {String} reservationToken - Reservation token (optional verification)
   * @returns {Boolean} True if lock was released
   */
  async releaseLock(seatId, reservationToken = null) {
    await this.init();

    // If token provided, verify before deleting
    if (reservationToken) {
      const lock = await this.getLock(seatId);
      if (lock && lock.reservationToken !== reservationToken) {
        throw new SeatLockError('Invalid reservation token for this seat');
      }
    }

    const key = this.getLockKey(seatId);
    const result = await this.redis.del(key);

    Logger.info('Seat lock released', {
      seatId,
      reservationToken,
      deleted: result === 1
    });

    return result === 1;
  }

  /**
   * Check if seat is locked
   * @param {String} seatId - Seat ID
   * @returns {Boolean} True if locked
   */
  async isLocked(seatId) {
    const lock = await this.getLock(seatId);
    return lock !== null;
  }

  /**
   * Calculate remaining time for a lock
   * @param {String} expiresAt - Expiry timestamp
   * @returns {Number} Remaining seconds
   */
  calculateRemainingTime(expiresAt) {
    const remaining = Math.ceil((new Date(expiresAt) - new Date()) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * Get remaining TTL for a seat lock
   * @param {String} seatId - Seat ID
   * @returns {Number|null} Remaining seconds or null
   */
  async getRemainingTTL(seatId) {
    await this.init();

    const key = this.getLockKey(seatId);
    const ttl = await this.redis.ttl(key);

    // ttl returns -2 if key doesn't exist, -1 if no expiry set
    return ttl > 0 ? ttl : null;
  }

  /**
   * Bulk check which seats are locked
   * @param {Array<String>} seatIds - Array of seat IDs
   * @returns {Object} Map of seatId -> isLocked
   */
  async bulkCheckLocks(seatIds) {
    await this.init();

    const pipeline = this.redis.multi();
    
    seatIds.forEach(seatId => {
      pipeline.exists(this.getLockKey(seatId));
    });

    const results = await pipeline.exec();
    
    const lockStatus = {};
    seatIds.forEach((seatId, index) => {
      lockStatus[seatId] = results[index] === 1;
    });

    return lockStatus;
  }
}

module.exports = new LockService();
