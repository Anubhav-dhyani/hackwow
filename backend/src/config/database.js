const mongoose = require('mongoose');

/**
 * MongoDB Connection Manager
 * 
 * Handles connection lifecycle, error handling, and graceful shutdown
 */
class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      this.isConnected = true;
      console.log('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      this.isConnected = false;
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      console.log('⚠️  MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Connect to MongoDB
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      if (this.isConnected) {
        console.log('ℹ️  Already connected to MongoDB');
        return;
      }

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(process.env.MONGODB_URI, options);
      
      // Create indexes after connection
      await this.ensureIndexes();
      
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Ensure all indexes are created
   * @returns {Promise<void>}
   */
  async ensureIndexes() {
    try {
      // Indexes will be created when models are registered
      console.log('📊 Database indexes will be created on first model access');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
    }
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed gracefully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

module.exports = new DatabaseConnection();
