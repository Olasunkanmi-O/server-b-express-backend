// routes/users.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /users/profile?username=...
router.get('/profile', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }
  try {
    const result = await pool.query(
      'SELECT id, business_name, business_structure, vat_enabled, has_employees, num_employees, username FROM users WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
