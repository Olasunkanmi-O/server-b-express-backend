// routes/chat.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { generateBusinessHealthSummary } = require('../services/chatService');

router.post('/query', async (req, res) => {
  const { userId, userQuery } = req.body;
  
  if (!userId || !userQuery) {
    return res.status(400).json({ error: 'userId and userQuery are required' });
  }

  try {
    // 1. Fetch categorized transactions for the user from the database
    const result = await pool.query(
      'SELECT date, amount, description, category, tax_label FROM transactions WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );
    const transactions = result.rows;
    
    // 2. Pass the user query and transactions to the chat service
    const summary = generateBusinessHealthSummary(userQuery, transactions);
    
    // 3. Return the plain English summary
    res.json({ response: summary });
    
  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({ error: 'Failed to process chat query' });
  }
});

module.exports = router;