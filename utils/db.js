import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    this.uri = `mongodb://${this.host}:${this.port}/${this.database}`;
    this.client = null;
  }

  async init() {
    try {
      this.client = new MongoClient(this.uri, { useNewUrlParser: true, useUnifiedTopology: true });
      await this.client.connect();
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  }

  isAlive() {
    return this.client && this.client.readyState === 2; // 2 represents 'connected'
  }

  async nbUsers() {
    if (!this.isAlive()) {
      return 0;
    }
    const db = this.client.db();
    const usersCollection = db.collection('users');
    const count = await usersCollection.countDocuments();
    return count;
  }

  async nbFiles() {
    if (!this.isAlive()) {
      return 0;
    }
    const db = this.client.db();
    const filesCollection = db.collection('files');
    const count = await filesCollection.countDocuments();
    return count;
  }
}

// Create and export an instance of DBClient
const dbClient = new DBClient();
dbClient.init(); // Initialize the connection

export default dbClient;
