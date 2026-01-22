const mongoose = require('mongoose');

/**
 * Seat Schema
 * 
 * Represents a bookable seat/slot across all domains
 * Each seat belongs to an app and an entity (event, bus route, movie show)
 */
const seatSchema = new mongoose.Schema({
  appId: {
    type: String,
    required: true,
    ref: 'App',
    description: 'Which app owns this seat'
  },
  
  domain: {
    type: String,
    required: true,
    enum: ['EVENT', 'BUS', 'MOVIE'],
    description: 'Business domain'
  },
  
  entityId: {
    type: String,
    required: true,
    description: 'Event ID, Bus Route ID, Movie Show ID, etc.'
  },
  
  seatNumber: {
    type: String,
    required: true,
    trim: true,
    description: 'Seat identifier (A1, Row-5-Seat-3, etc.)'
  },
  
  status: {
    type: String,
    required: true,
    enum: ['AVAILABLE', 'BOOKED'],
    default: 'AVAILABLE',
    description: 'MongoDB status (LOCKED state is in Redis)'
  },
  
  price: {
    type: Number,
    required: true,
    min: 0,
    description: 'Seat price in base currency'
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Seat type (VIP, Regular), tier, extras, etc.'
  },
  
  bookedBy: {
    type: mongoose.Schema.Types.Mixed, // Support both ObjectId and String for external users
    default: null,
    description: 'User who booked this seat (ObjectId for internal users, String for external users)'
  },
  
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
    description: 'Reference to booking document'
  }
}, {
  timestamps: true,
  collection: 'seats'
});

// Composite unique index: same seat number cannot exist twice for same app+entity
seatSchema.index(
  { appId: 1, entityId: 1, seatNumber: 1 }, 
  { unique: true }
);

// Compound index for efficient seat listing queries
seatSchema.index({ appId: 1, status: 1 });
seatSchema.index({ appId: 1, entityId: 1, status: 1 });

// Methods
seatSchema.methods.isAvailable = function() {
  return this.status === 'AVAILABLE';
};

seatSchema.methods.markBooked = function(userId, bookingId) {
  this.status = 'BOOKED';
  this.bookedBy = userId;
  this.bookingId = bookingId;
};

module.exports = mongoose.model('Seat', seatSchema);
