const mongoose = require('mongoose');

/**
 * User Schema (Layer 3 Authentication)
 * 
 * Represents end-users who can book across all apps
 * Shared user pool - one account for EVENT, BUS, MOVIE bookings
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    description: 'User email (unique identifier)'
  },
  
  passwordHash: {
    type: String,
    required: true,
    description: 'Bcrypt hash of password'
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    description: 'User full name'
  },
  
  phone: {
    type: String,
    trim: true,
    sparse: true,
    description: 'Optional phone number'
  },
  
  isActive: {
    type: Boolean,
    default: true,
    description: 'Account status (for suspension)'
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional user profile data'
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ isActive: 1 });

// Methods
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.passwordHash; // Never expose password hash
  return obj;
};

module.exports = mongoose.model('User', userSchema);
