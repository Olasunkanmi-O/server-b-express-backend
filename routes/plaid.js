// routes/plaid.js
const express = require('express');
const router = express.Router();
const plaidClient = require('../plaidClient');
const pool = require('../db');
const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS || 'transactions').split(',');
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(',')
const { fetchTransactions } = require('../utils/plaidHelpers');


// This route is called by the frontend to create a Plaid Link token
router.post('/create_link_token', async (req, res) => {
  console.log('Received request body:', req.body);
  try {
    const plaidRequest = {
      user: {
        // This should correspond to a unique id for the current user.
        client_user_id: String(req.body.userId),
      },
      client_name: 'FiscalGuide',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(plaidRequest);
    res.json(createTokenResponse.data);
  } catch (error) {
    console.error('Error creating link token:', error.response.data);
    res.status(500).send('Error creating link token');
  }
});

// This route exchanges a public token for a Plaid access token
router.post('/exchange_public_token', async (req, res) => {
  const { public_token, userId } = req.body;

  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: public_token,
    });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Store the access token and item ID in the database
    await pool.query(
      'INSERT INTO user_plaid_accounts (user_id, item_id, access_token) VALUES ($1, $2, $3)',
      [userId, itemId, accessToken]
    );

    res.status(200).json({ message: 'Public token exchanged successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to exchange public token' });
  }
});

// This route retrieves transactions from Plaid and saves them
router.get('/transactions', async (req, res) => {
  const { userId, start_date, end_date } = req.query;

  try {
    const accountResult = await pool.query(
      'SELECT access_token FROM user_plaid_accounts WHERE user_id = $1',
      [userId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plaid account not found for this user' });
    }

    const accessToken = accountResult.rows[0].access_token;

    const transactionResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: start_date,
      end_date: end_date,
    });

    // Check if the Plaid response contains data and transactions
    if (!transactionResponse || !transactionResponse.data || !transactionResponse.data.transactions) {
      return res.status(200).json([]);
    }

    const transactions = transactionResponse.data.transactions;
    const client_transactions = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const transaction of transactions) {
        // Ensure the transaction has a valid ID before attempting to process
        if (!transaction.transaction_id) {
          continue;
        }

        const existingTx = await client.query(
          'SELECT plaid_transaction_id FROM transactions WHERE plaid_transaction_id = $1',
          [transaction.transaction_id]
        );

        if (existingTx.rows.length === 0) {
          // Corrected line: Access the 'detailed' property of the category object
          const category = transaction.personal_finance_category ? transaction.personal_finance_category.detailed : 'Uncategorized';
          const description = transaction.name || 'No Description';
          const amount = transaction.amount || 0;

          await client.query(
            `INSERT INTO transactions (user_id, plaid_transaction_id, date, description, amount, category) 
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, transaction.transaction_id, transaction.date, description, amount, category]
          );
        }

        client_transactions.push({
          id: transaction.transaction_id,
          amount: transaction.amount,
          category: transaction.personal_finance_category ? transaction.personal_finance_category.detailed : 'Uncategorized',
          date: transaction.date,
          description: transaction.name
        });
      }

      await client.query('COMMIT');
      res.status(200).json(client_transactions);

    } catch (dbErr) {
      await client.query('ROLLBACK');
      console.error('Database transaction failed:', dbErr);
      res.status(500).json({ error: 'Failed to synchronize transactions.' });
    } finally {
      client.release();
    }

  } catch (plaidErr) {
    console.error('Plaid API error:', plaidErr);
    res.status(500).json({ error: 'Failed to retrieve transactions from Plaid.' });
  }
});

module.exports = router;