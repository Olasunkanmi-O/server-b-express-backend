// // services/chatService.js
// const axios = require('axios');

// async function generateBusinessHealthSummary(userId, userQuery, transactions) {
//   const payload = {
//     user_id: userId,          // int
//     query: userQuery,         // string question, e.g. "can I save 300 this month?"
//     request: transactions,    // list of transaction objects
//     session_id: "abc123",     // optional, can be null/undefined
//     scenario_type: "cashflow", // decide your default
//     timeframe_days: 30,       // adjust as needed
//     aggregation_days: 7,      // adjust as needed
//     hypothetical_changes: []  // provide list if needed
//   };


//   // console.log('Sending to Server A:', payload);
  

//   try {
//     const response = await axios.post(
//       'http://127.0.0.1:8000/transactions/scenario',
//       payload
//     );
//     return response.data;
//   } catch (err) {
//     console.error('LLM call failed:', err.message);
//     return { error: "Sorry, I couldn't generate a summary at this time." };
//   }
// }

// module.exports = { generateBusinessHealthSummary };
