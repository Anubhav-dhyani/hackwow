const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { PaymentError } = require('../utils/errors');
const Logger = require('../utils/logger');

/**
 * Payment Service (Simulated)
 * 
 * Simulates payment gateway interactions
 * In production, replace with actual payment provider (Stripe, PayPal, etc.)
 */
class PaymentService {
  /**
   * Simulate payment processing
   * @param {Object} paymentData - Payment details
   * @returns {Object} Payment result
   */
  async processPayment(paymentData) {
    const { amount, currency = 'USD', userId, metadata = {} } = paymentData;

    // Validate payment amount
    if (!amount || amount <= 0) {
      throw new PaymentError('Invalid payment amount');
    }

    if (!env.PAYMENT_SIMULATION) {
      throw new Error('Payment gateway not configured');
    }

    Logger.info('Processing simulated payment', {
      amount,
      currency,
      userId
    });

    // Simulate network delay
    await this.simulateDelay(500, 1500);

    // Simulate 95% success rate
    const isSuccess = Math.random() > 0.05;

    if (!isSuccess) {
      Logger.warn('Simulated payment failed', { userId, amount });
      throw new PaymentError('Payment declined by payment gateway', {
        reason: 'SIMULATED_FAILURE'
      });
    }

    const paymentId = this.generatePaymentId();

    Logger.info('Simulated payment successful', {
      paymentId,
      amount,
      currency,
      userId
    });

    return {
      paymentId,
      status: 'SUCCESS',
      amount,
      currency,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  /**
   * Verify payment (idempotent)
   * @param {String} paymentId - Payment ID to verify
   * @returns {Object} Payment status
   */
  async verifyPayment(paymentId) {
    if (!paymentId) {
      throw new PaymentError('Payment ID is required');
    }

    Logger.info('Verifying payment', { paymentId });

    // In a real implementation, this would query the payment gateway
    // For simulation, we assume all paymentIds are valid if they match format
    const isValid = this.validatePaymentIdFormat(paymentId);

    if (!isValid) {
      throw new PaymentError('Invalid payment ID format');
    }

    await this.simulateDelay(200, 500);

    return {
      paymentId,
      status: 'VERIFIED',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Refund payment (for cancellations)
   * @param {String} paymentId - Payment ID to refund
   * @param {Number} amount - Amount to refund
   * @returns {Object} Refund result
   */
  async refundPayment(paymentId, amount) {
    if (!env.PAYMENT_SIMULATION) {
      throw new Error('Payment gateway not configured');
    }

    Logger.info('Processing refund', { paymentId, amount });

    await this.simulateDelay(500, 1000);

    const refundId = this.generateRefundId();

    return {
      refundId,
      paymentId,
      amount,
      status: 'REFUNDED',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate simulated payment ID
   * @returns {String} Payment ID
   */
  generatePaymentId() {
    const prefix = 'PAY';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().split('-')[0].toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generate simulated refund ID
   * @returns {String} Refund ID
   */
  generateRefundId() {
    const prefix = 'REF';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().split('-')[0].toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Validate payment ID format
   * @param {String} paymentId - Payment ID
   * @returns {Boolean} True if valid
   */
  validatePaymentIdFormat(paymentId) {
    // Accept both Razorpay format (pay_XXXXX) and simulated format (PAY-XXXXX-XXXXX)
    const razorpayPattern = /^pay_[A-Za-z0-9]+$/;
    const simulatedPattern = /^PAY-[A-Z0-9]+-[A-Z0-9]+$/;
    return razorpayPattern.test(paymentId) || simulatedPattern.test(paymentId);
  }

  /**
   * Simulate network delay
   * @param {Number} min - Minimum delay (ms)
   * @param {Number} max - Maximum delay (ms)
   * @returns {Promise<void>}
   */
  async simulateDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

module.exports = new PaymentService();
