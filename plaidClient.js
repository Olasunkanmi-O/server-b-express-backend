// plaidClient.js
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
require('dotenv').config();

const env = process.env.PLAID_ENV || 'sandbox';

// Map env string to PlaidEnvironments enum
const basePath = env === 'production'
  ? PlaidEnvironments.production
  : PlaidEnvironments.sandbox;

const configuration = new Configuration({
  basePath: basePath,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

const plaidClient = new PlaidApi(configuration);

module.exports = plaidClient;
