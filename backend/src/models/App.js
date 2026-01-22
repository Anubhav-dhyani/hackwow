const mongoose = require('mongoose');

/**
 * App Schema (Layer 2 Authentication - Multi-Tenant)
 * 
 * Represents a frontend application (tenant) that uses this backend
 * Each app has unique credentials and domain restrictions
 */
const appSchema = new mongoose.Schema({
  appId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    description: 'Unique identifier for the app (e.g., "event-app-prod")'
  },
  
  apiKeyHash: {
    type: String,
    required: true,
    description: 'Bcrypt hash of the API key'
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    description: 'Human-readable app name'
  },
  
  domain: {
    type: String,
    required: true,
    enum: ['EVENT', 'BUS', 'MOVIE'],
    description: 'Business domain this app belongs to'
  },
  
  allowedDomains: {
    type: [String],
    required: true,
    default: [],
    description: 'Whitelist of domains allowed to use this app'
  },
  
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    description: 'Master kill switch for the app'
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional app-specific configuration'
  },
  
  createdBy: {
    type: String,
    description: 'Admin email who created this app'
  }
}, {
  timestamps: true,
  collection: 'apps'
});

// Indexes
appSchema.index({ appId: 1 }, { unique: true });
appSchema.index({ domain: 1, isActive: 1 });
appSchema.index({ isActive: 1 });

// Methods
appSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.apiKeyHash; // Never expose API key hash
  return obj;
};

module.exports = mongoose.model('App', appSchema);
