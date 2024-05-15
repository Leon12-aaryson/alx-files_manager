// import express from 'express';
// import routes from './routes/index.js';
const express = require('express');
const routes = require('./routes/index.js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Load all routes from routes/index.js
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
