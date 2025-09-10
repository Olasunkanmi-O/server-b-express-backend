const pool = require('../db');

async function categorizeTransaction(transaction) {
  const { name, amount, plaid_category } = transaction;
  const description = name.toLowerCase();

  // Step 1: Try to map Plaid category from DB
  if (plaid_category) {
    const result = await pool.query(
      'SELECT tax_category, deductible, vat_applicable FROM category_mappings WHERE plaid_category = $1 LIMIT 1',
      [plaid_category]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }

  // Step 2: Fallback to rule-based logic
  let tax_category = 'General Expense';
  let deductible = true;
  let vat_applicable = true;

  if (description.includes('hmrc')) tax_category = 'Tax';
  else if (description.includes('salary') || description.includes('payroll')) tax_category = 'Income';
  else if (description.includes('rent') || description.includes('mortgage')) tax_category = 'Rent/Mortgage';
  else if (description.includes('utility') || description.includes('electricity') || description.includes('gas')) tax_category = 'Utilities';
  else if (amount > 0) tax_category = 'Sales';

  return { tax_category, deductible, vat_applicable };
}

module.exports = {
  categorizeTransaction,
};