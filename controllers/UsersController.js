const bcrypt = require('bcrypt');
const dbClient = require('../utils/db');

const UsersController = {
  async postNew(req, res) {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      // Check if email already exists in the database
      const existingUser = await dbClient.usersCollection().findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the new user object
      const newUser = {
        email,
        password: hashedPassword
      };

      // Insert the new user into the database
      const result = await dbClient.usersCollection().insertOne(newUser);

      // Return the new user with only the email and id
      const createdUser = {
        id: result.insertedId,
        email
      };

      return res.status(201).json(createdUser);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = UsersController;
