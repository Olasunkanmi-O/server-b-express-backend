// app.js
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
//const transactionRoutes = require('./routes/transactions');
const plaidRoutes = require('./routes/plaid');
//const chatRoutes = require('./routes/chat');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Add a basic route to confirm the server is running
app.get('/', (req, res) => {
  res.send('FiscalGuide Backend is running!');
});

// Mount routes with base URL prefixes
app.use('/auth', authRoutes);     // Signup, login
app.use('/users', userRoutes);    // User profile, management
//app.use('/transactions', transactionRoutes);
app.use('/plaid', plaidRoutes);
//app.use('/chat', chatRoutes);


module.exports = app;