const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db.config');
const { QueryTypes } = require('sequelize');
const router = express.Router();

const schema = process.env.DB_SCHEMA;

// ✅ JWT Token generator - استخدم "id" بدل "userId"
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// =======================
// Signup
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
// Login
// =======================

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // نبحث في جميع الجداول واحداً تلو الآخر
    let user = null;
    let userType = null;

    // 1. بحث في userss
    let query = `SELECT * FROM "${schema}".userss WHERE email = :email`;
    let results = await sequelize.query(query, {
      replacements: { email },
      type: QueryTypes.SELECT
    });
    if (results.length > 0) {
      user = results[0];
      userType = 'Individual';
    }

    // 2. إذا ما لقيت في userss، ابحث في companies
    if (!user) {
      query = `SELECT * FROM "${schema}".companies WHERE email = :email`;
      results = await sequelize.query(query, {
        replacements: { email },
        type: QueryTypes.SELECT
      });
      if (results.length > 0) {
        user = results[0];
        userType = 'Company';
      }
    }

    // 3. إذا ما لقيت في companies، ابحث في offices
    if (!user) {
      query = `SELECT * FROM "${schema}".offices WHERE email = :email`;
      results = await sequelize.query(query, {
        replacements: { email },
        type: QueryTypes.SELECT
      });
      if (results.length > 0) {
        user = results[0];
        userType = 'Office';
      }
    }

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = generateToken(user.id, userType);

    res.json({
      message: 'Login successful',
      token,
      user,
      userType // أرسل نوع المستخدم مع الرد
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});


module.exports = router;
