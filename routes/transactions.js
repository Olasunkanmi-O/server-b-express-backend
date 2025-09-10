const express = require('express');
const router = express.Router();
const pool = require('../db');
const { categorizeTransaction } = require('../services/mlCategorizer');
const { calculateVAT, calculateCorporationTax } = require('../services/taxService');

router.post('/upload', async (req, res) => {
  const { user_id, transactions } = req.body;

  if (!user_id || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'user_id and transactions array required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const tx of transactions) {
      const { date, description, amount, plaid_category } = tx;
      if (!date || !description || amount === undefined) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Each transaction must have date, description, and amount' });
      }

      //  Categorize transaction
      const categorization = await categorizeTransaction({
        name: description,
        amount,
        plaid_category
      });

      const { tax_category, deductible, vat_applicable } = categorization;
      const vat_rate = vat_applicable ? 0.20 : 0.0;
      const vat_amount = parseFloat(amount) * vat_rate;

      //  Insert enriched transaction
      await client.query(
        `INSERT INTO transactions (
          user_id, date, description, amount,
          plaid_category, tax_category, deductible,
          vat_applicable, vat_rate, vat_amount
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          user_id, date, description, amount,
          plaid_category, tax_category, deductible,
          vat_applicable, vat_rate, vat_amount
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Transactions uploaded and categorized successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});



router.post('/tax-summary', async (req, res) => {
  const { user_id, start_date, end_date } = req.body;

  if (!user_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'user_id, start_date, and end_date are required' });
  }

  try {
    //  Fetch transactions in range
    const result = await pool.query(
      `SELECT amount, tax_category, deductible, vat_applicable, vat_rate
       FROM transactions
       WHERE user_id = $1 AND date BETWEEN $2 AND $3`,
      [user_id, start_date, end_date]
    );

    const transactions = result.rows;

    //  Separate income and expenses
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of transactions) {
      const amt = parseFloat(tx.amount);
      if (tx.tax_category === 'Sales' || tx.tax_category === 'Income') {
        totalIncome += amt;
      } else if (tx.deductible) {
        totalExpenses += amt;
      }
    }

    //  Calculate VAT
    const { vatDue, vatReclaimable } = calculateVAT(transactions);

    //  Calculate Corporation Tax
    const corpTax = calculateCorporationTax({ totalIncome, totalExpenses });

    //  Net profit
    const netProfit = totalIncome - totalExpenses;

    //  Store summary
    await pool.query(
      `INSERT INTO tax_summaries (
        user_id, period_start, period_end,
        total_income, total_expenses,
        vat_due, vat_reclaimable, net_profit
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [user_id, start_date, end_date, totalIncome, totalExpenses, vatDue, vatReclaimable, netProfit]
    );

    res.status(200).json({
      message: 'Tax summary generated and stored',
      summary: {
        totalIncome,
        totalExpenses,
        vatDue,
        vatReclaimable,
        netProfit,
        corporationTax: corpTax
      }
    });

  } catch (err) {
    console.error('Tax summary error:', err.message);
    res.status(500).json({ error: 'Failed to generate tax summary' });
  }
});

router.get('/tax-summary', async (req, res) => {
  const { user_id, period_start, period_end } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    let query = `SELECT * FROM tax_summaries WHERE user_id = $1`;
    const params = [user_id];

    if (period_start && period_end) {
      query += ` AND period_start = $2 AND period_end = $3`;
      params.push(period_start, period_end);
    }

    const result = await pool.query(query, params);
    res.status(200).json({ summaries: result.rows });

  } catch (err) {
    console.error('Tax summary fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tax summaries' });
  }
});

module.exports = router;