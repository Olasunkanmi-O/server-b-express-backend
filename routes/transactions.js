// routes/transactions.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { calculateVAT } = require('../services/taxService');
const authenticateToken = require('../middleware/authMiddleware');


// Upload transactions - sample JSON POST
router.post('/upload', async (req, res) => {
  const { user_id, transactions } = req.body;

  if (!user_id || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'user_id and transactions array required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const tx of transactions) {
      const { date, description, amount } = tx;
      if (!date || !description || amount === undefined) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Each transaction must have date, description, and amount' });
      }
      await client.query(
        'INSERT INTO transactions (user_id, date, description, amount) VALUES ($1, $2, $3, $4)',
        [user_id, date, description, amount]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Transactions uploaded successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Fetch transactions for a user
router.get('/', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id required' });
  }
  try {
    const result = await pool.query(
      'SELECT id, date, description, amount, category FROM transactions WHERE user_id = $1 ORDER BY date DESC',
      [user_id]
    );
    res.status(200).json({ transactions: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// New route to calculate tax
router.get('/tax-summary', async (req, res) => {
  const { user_id, start_date, end_date } = req.query;
  // (1) Fetch transactions for the user from the database
  const transactions = await pool.query(
    'SELECT * FROM transactions WHERE user_id = $1 AND date BETWEEN $2 AND $3',
    [user_id, start_date, end_date]
  );
  // (2) Pass the transactions to the new service
  const taxSummary = calculateVAT(transactions.rows);
  // (3) Return the summary to the user
  res.json({ taxSummary });
});

router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  // fetch transactions for userId
});

