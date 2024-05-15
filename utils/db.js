
import { MongoClient } from 'mongodb';

class DBClient {

  constructor() {
    // Obtain host, port, and database from environment variables or use defaults
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    // Construct MongoDB connection URI
    const uri = `mongodb://${host}:${port}/${database}`;
    // Create a new MongoClient instance
    this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    // Connect to MongoDB
    this.client.connect((err) => {
      if (err) {
        console.error('MongoDB connection error:', err);
      } else {
        console.log('Connected to MongoDB');
      }
    });
  }
  
  /**
  * Checks if this client's connection to MongoDB server is active.
  * @returns {boolean} - True if the connection is active, otherwise false.
  */

  isAlive() {
    return !!this.client && this.client.isConnected();
  }
  /**
   * Retrieves the number of documents in the `users` collection.
   * @returns {Promise<number>} - A promise that resolves to the number of documents in the `users` collection.
   */
  async nbUsers() {
    if (!this.isAlive()) {
      return 0;
    }
    const db = this.client.db();
    const usersCollection = db.collection('users');
    const count = await usersCollection.countDocuments();
    return count;
  }

  /**
   * Retrieves the number of documents in the `files` collection.
   * @returns {Promise<number>} - A promise that resolves to the number of documents in the `files` collection.
   */

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
module.exports = dbClient;
