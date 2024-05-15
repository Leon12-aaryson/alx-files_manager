const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    // Display any error in the console
    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  isAlive() {
    // Check if the connection to Redis is successful
    return this.client.connected;
  }

  async get(key) {
    // Retrieve value from Redis for the given key
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  async set(key, value, duration) {
    // Store value in Redis with expiration set by duration
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  async del(key) {
    // Remove value from Redis for the given key
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
    });
  }
}

// Create and export an instance of RedisClient
const redisClient = new RedisClient();
module.exports = redisClient;
