import mongodb from 'mongodb';
import envLoader from './env_loader';

/**
 * Represents a MongoDB client.
 */
class DBClient {
  /**
   * Creates a new DBClient instance.
   * Initializes a MongoDB client with the provided environment variables or default values.
   */
  constructor() {
    envLoader();
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const dbURL = `mongodb://${host}:${port}/${database}`;

    this.client = new mongodb.MongoClient(dbURL, { useUnifiedTopology: true });

    // Connect to MongoDB
    this.connect();
  }

  /**
   * Connects to the MongoDB server.
   * Logs any errors that occur during the connection process.
   */
  connect() {
    this.client.connect((err) => {
      if (err) {
        console.error('Error connecting to MongoDB:', err);
      } else {
        console.log('Connected to MongoDB');
      }
    });
  }

  /**
   * Checks if this client's connection to
   * MongoDB server is active.
   * @returns {boolean} - True if the connection is active, otherwise false.
   */
  isAlive() {
    return this.client.isConnected();
  }

  /**
   * Retrieves the number of users in the database.
   * @returns {Promise<Number>} - A promise that resolves to the number of users.
   */
  async nbUsers() {
    try {
      const usersCollection = this.client.db().collection('users');
      return await usersCollection.countDocuments();
    } catch (error) {
      console.error('Error retrieving number of users:', error);
      return 0;
    }
  }

  /**
   * Retrieves the number of files in the database.
   * @returns {Promise<Number>} - A promise that resolves to the number of files.
   */
  async nbFiles() {
    try {
      const filesCollection = this.client.db().collection('files');
      return await filesCollection.countDocuments();
    } catch (error) {
      console.error('Error retrieving number of files:', error);
      return 0;
    }
  }

  /**
   * Retrieves a reference to the `users` collection.
   * @returns {Promise<Collection>} - A promise that resolves to the `users` collection.
   */
  async usersCollection() {
    return this.client.db().collection('users');
  }

  /**
   * Retrieves a reference to the `files` collection.
   * @returns {Promise<Collection>} - A promise that resolves to the `files` collection.
   */
  async filesCollection() {
    return this.client.db().collection('files');
  }
}

const dbClient = new DBClient();
export default dbClient;
