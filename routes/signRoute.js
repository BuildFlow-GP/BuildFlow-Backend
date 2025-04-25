const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db.config'); // Sequelize instance
const { QueryTypes } = require('sequelize');
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
    let query;
    let replacements;

    if (userType === 'Individual') {
      query = `
        INSERT INTO "${schema}".userss (name, email, password_hash, phone)
        VALUES (:name, :email, :password_hash, :phone)
        RETURNING id, name, email
      `;
      replacements = { name, email, password_hash: hashedPassword, phone };
    } else if (userType === 'Company') {
      query = `
        INSERT INTO "${schema}".companies (name, email, password_hash, phone)
        VALUES (:name, :email, :password_hash, :phone)
        RETURNING id, name, email
      `;
      replacements = { name, email, password_hash: hashedPassword, phone };
    } else if (userType === 'Office') {
      const { location, capacity } = req.body;
      if (!location || capacity == null) {
        return res.status(400).json({ error: 'Missing location or capacity for office signup' });
      }

      query = `
        INSERT INTO "${schema}".offices (name, email, password_hash, phone, location, capacity)
        VALUES (:name, :email, :password_hash, :phone, :location, :capacity)
        RETURNING id, name, email, location, capacity
      `;
      replacements = { name, email, password_hash: hashedPassword, phone, location, capacity };
    }

    const [user] = await sequelize.query(query, {
      replacements,
      type: QueryTypes.INSERT
    });

    res.status(201).json({
      message: `${userType} created successfully`,
      user: user[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// =======================
// Login Route
// =======================
router.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;

  if (!userType || !['Individual', 'Company', 'Office'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid or missing userType' });
  }

  try {
    let query;

    if (userType === 'Individual') {
      query = `SELECT * FROM "${schema}".userss WHERE email = :email`;
    } else if (userType === 'Company') {
      query = `SELECT * FROM "${schema}".companies WHERE email = :email`;
    } else if (userType === 'Office') {
      query = `SELECT * FROM "${schema}".offices WHERE email = :email`;
    }

    const users = await sequelize.query(query, {
      replacements: { email },
      type: QueryTypes.SELECT
    });

    if (users.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = users[0];
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
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
