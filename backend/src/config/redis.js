const redis = require('redis');

/**
 * Redis Connection Manager
 * 
 * Provides Redis client with connection handling, retry logic, and graceful shutdown
 */
class RedisConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Connect to Redis
   * @returns {Promise<RedisClient>}
   */
  async connect() {
    try {
      if (this.client && this.isConnected) {
        console.log('ℹ️  Already connected to Redis');
        return this.client;
      }

      const config = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Max Redis reconnect attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            console.log(`🔄 Reconnecting to Redis in ${delay}ms (attempt ${retries})`);
            return delay;
          }
        }
      };

      // Add password if provided
      if (process.env.REDIS_PASSWORD) {
        config.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(config);

      // Event listeners
      this.client.on('connect', () => {
        console.log('🔗 Connecting to Redis...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        console.log('✅ Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        console.error('❌ Redis error:', err);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        console.log('⚠️  Redis connection closed');
      });

      await this.client.connect();
      
      return this.client;
      
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Get Redis client instance
   * @returns {RedisClient}
   */
  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isReady() {
    return this.client && this.isConnected && this.client.isReady;
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        console.log('✅ Redis connection closed gracefully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Ping Redis to check connection
   * @returns {Promise<string>}
   */
  async ping() {
    try {
      const response = await this.client.ping();
      return response;
    } catch (error) {
      console.error('❌ Redis ping failed:', error);
      throw error;
    }
  }
}

module.exports = new RedisConnection();
