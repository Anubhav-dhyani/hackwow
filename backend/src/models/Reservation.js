const mongoose = require('mongoose');

/**
 * Reservation Schema
 * 
 * Tracks seat reservation lifecycle (audit trail)
 * Used for debugging, analytics, and handling edge cases
 */
const reservationSchema = new mongoose.Schema({
  reservationToken: {
    type: String,
    required: true,
    unique: true,
    description: 'Unique token for this reservation (UUID)'
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    description: 'User who made the reservation'
  },
  
  appId: {
    type: String,
    required: true,
    ref: 'App',
    description: 'App context'
  },
  
  seatId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Seat',
    description: 'Reserved seat'
  },
  
  status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'EXPIRED', 'CONFIRMED', 'RELEASED'],
    default: 'ACTIVE',
    description: 'Reservation lifecycle status'
  },
  
  expiresAt: {
    type: Date,
    required: true,
    description: 'When this reservation expires'
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional reservation context'
  }
}, {
  timestamps: true,
  collection: 'reservations'
});

// Indexes
reservationSchema.index({ reservationToken: 1 }, { unique: true });
reservationSchema.index({ userId: 1, status: 1 });
reservationSchema.index({ seatId: 1 });
reservationSchema.index({ expiresAt: 1 }); // For cleanup jobs
reservationSchema.index({ appId: 1, createdAt: -1 });

// Methods
reservationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

reservationSchema.methods.isActive = function() {
  return this.status === 'ACTIVE' && !this.isExpired();
};

module.exports = mongoose.model('Reservation', reservationSchema);
