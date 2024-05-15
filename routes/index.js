// const express = require('express');
// const router = express.Router();
// const AppController = require('../controllers/AppController');
// const UsersController = require('../controllers/UsersController');


// // Define the endpoints
// router.get('/status', AppController.getStatus);
// router.get('/stats', AppController.getStats);
// router.post('/users', UsersController.postNew);

// module.exports = router;

// eslint-disable-next-line no-unused-vars
import { Express } from 'express'; // Importing Express type for Express application
import AppController from '../controllers/AppController'; // Importing AppController for handling application status and statistics
import AuthController from '../controllers/AuthController'; // Importing AuthController for handling authentication-related endpoints
import UsersController from '../controllers/UsersController'; // Importing UsersController for handling user-related endpoints
import FilesController from '../controllers/FilesController'; // Importing FilesController for handling file-related endpoints
import { basicAuthenticate, xTokenAuthenticate } from '../middlewares/auth'; // Importing authentication middlewares
import { APIError, errorResponse } from '../middlewares/error'; // Importing error handling middlewares

/**
 * Injects routes with their handlers to the given Express application.
 * @param {Express} api - The Express application.
 */
const injectRoutes = (api) => {
  // Application status and statistics endpoints
  api.get('/status', AppController.getStatus);
  api.get('/stats', AppController.getStats);

  // Authentication endpoints
  api.get('/connect', basicAuthenticate, AuthController.getConnect);
  api.get('/disconnect', xTokenAuthenticate, AuthController.getDisconnect);

  // User endpoints
  api.post('/users', UsersController.postNew);
  api.get('/users/me', xTokenAuthenticate, UsersController.getMe);

  // File endpoints
  api.post('/files', xTokenAuthenticate, FilesController.postUpload);
  api.get('/files/:id', xTokenAuthenticate, FilesController.getShow);
  api.get('/files', xTokenAuthenticate, FilesController.getIndex);
  api.put('/files/:id/publish', xTokenAuthenticate, FilesController.putPublish);
  api.put('/files/:id/unpublish', xTokenAuthenticate, FilesController.putUnpublish);
  api.get('/files/:id/data', FilesController.getFile);

  // Handling undefined routes
  api.all('*', (req, res, next) => {
    errorResponse(new APIError(404, `Cannot ${req.method} ${req.url}`), req, res, next);
  });
  api.use(errorResponse); // Handling errors
};

export default injectRoutes;
