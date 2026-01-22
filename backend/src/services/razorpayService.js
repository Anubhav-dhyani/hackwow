/**
 * Razorpay Service
 * 
 * Handles Razorpay payment gateway integration:
 * - Order creation
 * - Payment verification (signature validation)
 * - Webhook handling
 * - Idempotent operations
 */
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { PaymentError } = require('../utils/errors');
const Logger = require('../utils/logger');

// Import Razorpay SDK (optional - can use direct API calls)
let Razorpay = null;
try {
  Razorpay = require('razorpay');
} catch (e) {
  Logger.warn('Razorpay SDK not installed. Using simulation mode.');
}

class RazorpayService {
  constructor() {
    this.isSimulated = !env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET;
    
    if (!this.isSimulated && Razorpay) {
      this.razorpay = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET
      });
      Logger.info('Razorpay SDK initialized');
    } else {
      Logger.info('Razorpay running in SIMULATION mode');
    }
    
    // Store orders for idempotency (in-memory for simulation)
    // In production, use Redis or database
    this.orderCache = new Map();
  }

  /**
   * Create Razorpay Order (Idempotent)
   * 
   * @param {Object} orderData - Order details
   * @param {String} orderData.reservationToken - Unique reservation token (idempotency key)
   * @param {Number} orderData.amount - Amount in smallest currency unit (paise for INR)
   * @param {String} orderData.currency - Currency code (INR, USD)
   * @param {Object} orderData.notes - Additional metadata
   * @returns {Object} Razorpay order object
   */
  async createOrder(orderData) {
    const { reservationToken, amount, currency = 'INR', notes = {} } = orderData;

    if (!reservationToken) {
      throw new PaymentError('Reservation token is required for idempotency');
    }

    if (!amount || amount <= 0) {
      throw new PaymentError('Invalid amount');
    }

    // Check for existing order (idempotency)
    const existingOrder = this.orderCache.get(reservationToken);
    if (existingOrder) {
      Logger.info('Returning existing order (idempotent)', {
        orderId: existingOrder.id,
        reservationToken
      });
      return existingOrder;
    }

    Logger.info('Creating Razorpay order', {
      amount,
      currency,
      reservationToken
    });

    let order;

    if (this.isSimulated) {
      // SIMULATION MODE
      order = await this.simulateCreateOrder({
        amount,
        currency,
        receipt: reservationToken,
        notes: {
          ...notes,
          reservationToken
        }
      });
    } else {
      // REAL RAZORPAY
      order = await this.razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: reservationToken,
        notes: {
          ...notes,
          reservationToken
        }
      });
    }

    // Cache for idempotency
    this.orderCache.set(reservationToken, order);

    Logger.info('Razorpay order created', {
      orderId: order.id,
      amount: order.amount,
      reservationToken
    });

    return order;
  }

  /**
   * Verify Razorpay Payment Signature
   * 
   * This validates that the payment callback is genuinely from Razorpay
   * 
   * @param {Object} paymentData - Payment verification data
   * @param {String} paymentData.razorpay_order_id - Order ID
   * @param {String} paymentData.razorpay_payment_id - Payment ID
   * @param {String} paymentData.razorpay_signature - Signature
   * @returns {Object} Verification result
   */
  verifyPaymentSignature(paymentData) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = paymentData;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new PaymentError('Missing payment verification data');
    }

    Logger.info('Verifying Razorpay signature', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      isSimulated: this.isSimulated
    });

    // SIMULATION MODE - accept simulated signatures
    if (this.isSimulated) {
      if (razorpay_signature.startsWith('SIM_')) {
        return {
          verified: true,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id
        };
      }
    }

    // Check if we have valid credentials for real verification
    if (!env.RAZORPAY_KEY_SECRET) {
      Logger.warn('No Razorpay secret configured, accepting signature in test mode');
      return {
        verified: true,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      };
    }

    // REAL VERIFICATION using Razorpay's key secret
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      Logger.warn('Invalid Razorpay signature', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        expected: expectedSignature,
        received: razorpay_signature
      });
      throw new PaymentError('Invalid payment signature');
    }

    Logger.info('Razorpay signature verified', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });

    return {
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    };
  }

  /**
   * Handle Razorpay Webhook
   * 
   * Verifies and processes Razorpay webhooks for:
   * - payment.captured
   * - payment.failed
   * - refund.processed
   * 
   * @param {Object} payload - Webhook payload
   * @param {String} signature - X-Razorpay-Signature header
   * @returns {Object} Processed webhook data
   */
  verifyWebhook(payload, signature) {
    if (this.isSimulated) {
      Logger.info('Webhook verification skipped (simulation mode)');
      return { verified: true, event: payload.event, payload };
    }

    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      Logger.warn('Webhook secret not configured');
      throw new PaymentError('Webhook secret not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      Logger.warn('Invalid webhook signature');
      throw new PaymentError('Invalid webhook signature');
    }

    Logger.info('Webhook verified', { event: payload.event });

    return {
      verified: true,
      event: payload.event,
      payload
    };
  }

  /**
   * Get Payment Details
   * 
   * @param {String} paymentId - Razorpay payment ID
   * @returns {Object} Payment details
   */
  async getPayment(paymentId) {
    if (this.isSimulated) {
      return this.simulateGetPayment(paymentId);
    }

    return await this.razorpay.payments.fetch(paymentId);
  }

  /**
   * Refund Payment
   * 
   * @param {String} paymentId - Payment ID
   * @param {Number} amount - Refund amount (optional, full refund if not provided)
   * @returns {Object} Refund details
   */
  async refundPayment(paymentId, amount = null) {
    Logger.info('Processing refund', { paymentId, amount });

    if (this.isSimulated) {
      return this.simulateRefund(paymentId, amount);
    }

    const refundData = {};
    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    return await this.razorpay.payments.refund(paymentId, refundData);
  }

  // =====================
  // SIMULATION METHODS
  // =====================

  async simulateCreateOrder(options) {
    await this.delay(200, 500);

    const orderId = `order_SIM${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

    return {
      id: orderId,
      entity: 'order',
      amount: options.amount * 100, // Simulate Razorpay's paise format
      amount_paid: 0,
      amount_due: options.amount * 100,
      currency: options.currency,
      receipt: options.receipt,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
      notes: options.notes || {}
    };
  }

  simulateGetPayment(paymentId) {
    return {
      id: paymentId,
      entity: 'payment',
      amount: 10000,
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      captured: true,
      description: 'Simulated payment',
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  simulateRefund(paymentId, amount) {
    return {
      id: `rfnd_SIM${Date.now()}`,
      entity: 'refund',
      amount: amount ? amount * 100 : 10000,
      payment_id: paymentId,
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  generateSimulatedPaymentResponse(orderId, amount) {
    const paymentId = `pay_SIM${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
    const signature = `SIM_${crypto.createHash('md5').update(orderId + paymentId).digest('hex')}`;

    return {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    };
  }

  async delay(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new RazorpayService();
