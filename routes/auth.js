// routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs'); // Import bcryptjs
const { generateToken } = require('../utils/jwt');



// Signup route
router.post('/signup', async (req, res) => {
  console.log('Signup route hit');

  const {
    business_name,
    business_structure,
    vat_enabled,
    has_employees,
    num_employees,
    username,
    password,
  } = req.body;

  // Validate required fields
  const missingFields = [
    business_name,
    business_structure,
    vat_enabled,
    has_employees,
    username,
    password,
  ].some(field => field === undefined || field === null || field === '');

  if (missingFields) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const numEmp = has_employees ? num_employees : null;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (
        business_name, business_structure, vat_enabled,
        has_employees, num_employees, username, password
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, business_name
    `;

    const values = [
      business_name,
      business_structure,
      vat_enabled,
      has_employees,
      numEmp,
      username,
      hashedPassword,
    ];

    const { rows } = await pool.query(query, values);

    return res.status(201).json({
      message: 'User created successfully',
      user: rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }

    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Generate JWT token here
    const token = generateToken(user);

    // ✅ Remove sensitive info
    delete user.password;

    // ✅ Return user and token
    res.status(200).json({ user, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});


module.exports = router;