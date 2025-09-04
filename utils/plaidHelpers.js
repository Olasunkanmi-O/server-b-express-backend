// utils/plaidHelpers.js
const pool = require('../db');

async function getAccessToken(userId) {
  const result = await pool.query(
    'SELECT access_token FROM user_plaid_accounts WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    throw new Error('No Plaid access token found for user');
  }
  return result.rows[0].access_token;
}

module.exports = {
  getAccessToken,
};
