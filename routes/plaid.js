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

router.get('/transactions', async (req, res) => {
  console.log(`🚀 /transactions route triggered for user ${req.query.userId}`);
  const { userId, start_date, end_date } = req.query;
  console.log(`🔍 Starting transaction sync for user ${userId} from ${start_date} to ${end_date}`);

  try {
    const accountResult = await pool.query(
      'SELECT access_token FROM user_plaid_accounts WHERE user_id = $1',
      [userId]
    );

    if (accountResult.rows.length === 0) {
      console.warn(`⚠️ No Plaid account found for user ${userId}`);
      return res.status(404).json({ error: 'Plaid account not found for this user' });
    }

    const accessToken = accountResult.rows[0].access_token;
    console.log(`✅ Retrieved access token for user ${userId}`);

    const transactionResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: start_date,
      end_date: end_date,
    });

    if (!transactionResponse?.data?.transactions) {
      console.warn(`⚠️ No transactions returned from Plaid for user ${userId}`);
      return res.status(200).json([]);
    }

    const transactions = transactionResponse.data.transactions;
    console.log(`📥 Received ${transactions.length} transactions from Plaid`);

    const client_transactions = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const transaction of transactions) {
        if (!transaction.transaction_id) {
          console.warn(`⛔️ Skipping transaction with missing ID:`, transaction);
          continue;
        }

        const existingTx = await client.query(
          'SELECT plaid_transaction_id FROM transactions WHERE plaid_transaction_id = $1',
          [transaction.transaction_id]
        );

        if (existingTx.rows.length === 0) {
          const category = transaction.personal_finance_category?.detailed || 'Uncategorized';
          const description = transaction.name || 'No Description';
          const amount = transaction.amount || 0;

          console.log(`📝 Inserting new transaction: ${transaction.transaction_id} | £${amount} | ${category}`);

          await client.query(
            `INSERT INTO transactions (user_id, plaid_transaction_id, date, description, amount, plaid_category) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, transaction.transaction_id, transaction.date, description, amount, category]
          );
        } else {
          console.log(`🔁 Transaction already exists: ${transaction.transaction_id}`);
        }

        client_transactions.push({
          id: transaction.transaction_id,
          amount: transaction.amount,
          category: transaction.personal_finance_category?.detailed || 'Uncategorized',
          date: transaction.date,
          description: transaction.name
        });
      }

      await client.query('COMMIT');
      console.log(`✅ Successfully synced ${client_transactions.length} transactions for user ${userId}`);
      res.status(200).json(client_transactions);

    } catch (dbErr) {
      await client.query('ROLLBACK');
      console.error('❌ Database transaction failed:', dbErr);
      res.status(500).json({ error: 'Failed to synchronize transactions.' });
    } finally {
      client.release();
    }

  } catch (plaidErr) {
    console.error('❌ Plaid API error:', plaidErr);
    res.status(500).json({ error: 'Failed to retrieve transactions from Plaid.' });
  }
});

// this routes check whether the user has successfully connected their bank through plaid 
router.get("/plaid-status/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      "SELECT access_token FROM user_plaid_accounts WHERE user_id = $1",
      [userId]
    );

    const connected = result.rows.length > 0 && !!result.rows[0].access_token;
    res.json({ connected });
  } catch (err) {
    console.error("Error checking Plaid status:", err);
    res.status(500).json({ error: "Failed to check Plaid status" });
  }
});


module.exports = router;