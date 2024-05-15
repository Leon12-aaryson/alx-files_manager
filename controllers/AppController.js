const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

const AppController = {
  async getStatus(req, res) {
    const redisAlive = redisClient.isAlive();
    const dbAlive = dbClient.isAlive();

    if (redisAlive && dbAlive) {
      return res.status(200).json({ redis: true, db: true });
    } else {
      return res.status(500).json({ redis: redisAlive, db: dbAlive });
    }
  },

  async getStats(req, res) {
    try {
      const usersCount = await dbClient.nbUsers();
      const filesCount = await dbClient.nbFiles();
      return res.status(200).json({ users: usersCount, files: filesCount });
    } catch (error) {
      console.error('Error retrieving stats:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = AppController;
