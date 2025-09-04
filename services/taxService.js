// services/taxService.js
const moment = require('moment');

// A simple example of an HMRC VAT rule
const VAT_RATE_GB = 0.20; // 20% for most goods and services

/**
 * Calculates VAT based on a list of transactions.
 * Assumes a simplified scenario where all transactions are subject to VAT.
 * In a real-world application, this would be more complex and based on transaction categories.
 * @param {Array} transactions - An array of transaction objects.
 * @returns {Object} - An object containing the total sales and calculated VAT.
 */
function calculateVAT(transactions) {
  let totalSales = 0;
  for (const tx of transactions) {
    // Assuming transactions are already categorized and we only process sales
    if (tx.category === 'Sales') {
      totalSales += parseFloat(tx.amount);
    }
  }
  const vatAmount = totalSales * VAT_RATE_GB;
  return { totalSales, vatAmount };
}

/**
 * Calculates a simplified Corporation Tax.
 * Assumes a fixed rate and is based on a company's total profit.
 * @param {Object} financials - Object containing total income and total expenses.
 * @returns {number} - The calculated corporation tax amount.
 */
function calculateCorporationTax(financials) {
  const { totalIncome, totalExpenses } = financials;
  const profit = totalIncome - totalExpenses;
  const CORPORATION_TAX_RATE = 0.25; // A simplified rate for demonstration
  return profit > 0 ? profit * CORPORATION_TAX_RATE : 0;
}

module.exports = {
  calculateVAT,
  calculateCorporationTax,
};