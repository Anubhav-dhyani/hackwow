const mongoose = require('mongoose');

/**
 * Booking Schema
 * 
 * Represents a confirmed booking (payment successful)
 * Created only after payment confirmation
 */
const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Human-readable booking ID (BK-20260122-ABC123)'
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true,
    description: 'User who made the booking'
  },
  
  appId: {
    type: String,
    required: true,
    ref: 'App',
    index: true,
    description: 'App context'
  },
  
  seatId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Seat',
    index: true,
    description: 'Booked seat'
  },
  
  reservationToken: {
    type: String,
    required: true,
    ref: 'Reservation',
    description: 'Original reservation token'
  },
  
  // Payment information
  paymentStatus: {
    type: String,
    required: true,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING',
    index: true,
    description: 'Payment confirmation status'
  },
  
  paymentId: {
    type: String,
    required: true,
    description: 'Payment gateway transaction ID'
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0,
    description: 'Amount paid'
  },
  
  currency: {
    type: String,
    default: 'USD',
    description: 'Currency code'
  },
  
  // Metadata
  bookingDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
    description: 'When booking was created'
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional booking information'
  }
}, {
  timestamps: true,
  collection: 'bookings'
});

// Indexes
bookingSchema.index({ bookingId: 1 }, { unique: true });
bookingSchema.index({ userId: 1, bookingDate: -1 });
bookingSchema.index({ appId: 1, bookingDate: -1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ seatId: 1 });

// Static methods
bookingSchema.statics.generateBookingId = function() {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BK-${dateStr}-${random}`;
};

// Methods
bookingSchema.methods.isConfirmed = function() {
  return this.paymentStatus === 'SUCCESS';
};

module.exports = mongoose.model('Booking', bookingSchema);
