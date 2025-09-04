const axios = require('axios');

async function generateBusinessHealthSummary(userQuery, transactions) {
  try {
    const response = await axios.post('http://localhost:8000/transactions/scenario', {
      user_id: 1, // or dynamic
      scenario_text: userQuery
    });
    return response.data.answer;
  } catch (err) {
    console.error('LLM call failed:', err.message);
    return "Sorry, I couldn't generate a summary at this time.";
  }
}

module.exports = { generateBusinessHealthSummary };