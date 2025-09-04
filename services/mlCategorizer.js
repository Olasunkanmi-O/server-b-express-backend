// services/mlCategorizer.js
/**
 * A placeholder for a machine learning model.
 * This function simulates transaction categorization for the MVP.
 * A real ML model would be called here to return a category label.
 * @param {Object} transaction - A single transaction object from Plaid.
 * @returns {string} The assigned category for the transaction.
 */
function categorizeTransaction(transaction) {
  const { name, amount } = transaction;

  // Simple rule-based categorization for MVP
  const description = name.toLowerCase();

  if (description.includes('hmrc')) {
    return 'Tax';
  }
  if (description.includes('salary') || description.includes('payroll')) {
    return 'Income';
  }
  if (description.includes('rent') || description.includes('mortgage')) {
    return 'Rent/Mortgage';
  }
  if (description.includes('utility') || description.includes('electricity') || description.includes('gas')) {
    return 'Utilities';
  }
  if (amount > 0) { // Assuming positive amounts are income
    return 'Sales';
  }

  // Default to a general category if no rule matches
  return 'General Expense';
}

module.exports = {
  categorizeTransaction,
};