
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db.config');
const router = express.Router();



const schema = process.env.DB_SCHEMA;
// JWT Helper
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// =======================
// Signup Route
// =======================
router.post('/signup', async (req, res) => {
  const { name, email, password, phone, userType } = req.body;

  if (!userType || !['Individual', 'Company', 'Office'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid or missing userType' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let result;

    if (userType === 'Individual') {
      result = await pool.query(
        `INSERT INTO "${schema}".userss (name, email, password_hash, phone)
         VALUES ($1, $2, $3, $4) RETURNING id, name, email`,
        [name, email, hashedPassword, phone]
      );
    }

    else if (userType === 'Company') {
      result = await pool.query(
        `INSERT INTO "${schema}".companies (name, email, password_hash, phone)
         VALUES ($1, $2, $3, $4) RETURNING id, name, email`,
        [name, email, hashedPassword, phone]
      );
    }

    else if (userType === 'Office') {
      const { location, capacity } = req.body;
      if (!location || capacity == null) {
        return res.status(400).json({ error: 'Missing location or capacity for office signup' });
      }

      result = await pool.query(
        `INSERT INTO "${schema}".offices (name, email, password_hash, phone, location, capacity)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, location, capacity`,
        [name, email, hashedPassword, phone, location, capacity]
      );
    }

    res.status(201).json({
      message: `${userType} created successfully`,
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Signup failed' });
  }
});


// Login Route
// =======================
// Login Route
// =======================
router.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;
  console.log('BODY:', req.body);
console.log('EMAIL:', email);


  if (!userType || !['Individual', 'Company', 'Office'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid or missing userType' });
  }

  try {
    let result;

    if (userType === 'Individual') {
      result = await pool.query(
        `SELECT * FROM "${schema}".userss WHERE email = $1`,
        [email]
      );
    } else if (userType === 'Company') {
      result = await pool.query(
        `SELECT * FROM "${schema}".companies WHERE email = $1`,
        [email]
      );
    } else if (userType === 'Office') {
      result = await pool.query(
        `SELECT * FROM "${schema}".offices WHERE email = $1`,
        [email]
      );
    }

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;


