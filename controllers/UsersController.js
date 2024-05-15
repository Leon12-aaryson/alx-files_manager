/**
 * Module for handling user-related operations in the API.
 */
import sha1 from 'sha1'; // Importing SHA1 for password hashing
import Queue from 'bull/lib/queue'; // Importing Queue for asynchronous task handling
import dbClient from '../utils/db'; // Importing database client for interacting with the database

const userQueue = new Queue('email sending'); // Creating a new queue for email sending

export default class UsersController {
  /**
   * Handles the creation of a new user.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  static async postNew(req, res) {
    const email = req.body ? req.body.email : null; // Extracting email from request body
    const password = req.body ? req.body.password : null; // Extracting password from request body

    // Validating if email and password are provided
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    // Checking if the provided email already exists in the database
    const user = await (await dbClient.usersCollection()).findOne({ email });
    if (user) {
      res.status(400).json({ error: 'Already exist' });
      return;
    }

    // Hashing the password using SHA1
    const hashedPassword = sha1(password);

    // Inserting the new user (email and hashed password) into the database
    const insertionInfo = await (await dbClient.usersCollection()).insertOne({ email, password: hashedPassword });
    const userId = insertionInfo.insertedId.toString(); // Extracting the inserted user ID

    // Adding the user ID to the queue for email sending (assuming asynchronous email sending process)
    userQueue.add({ userId });

    // Sending a success response with the newly created user's email and ID
    res.status(201).json({ email, id: userId });
  }

  /**
   * Retrieves information about the currently authenticated user.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  static async getMe(req, res) {
    const { user } = req; // Retrieving user information from the request object

    // Sending a success response with the user's email and ID
    res.status(200).json({ email: user.email, id: user._id.toString() });
  }
}
