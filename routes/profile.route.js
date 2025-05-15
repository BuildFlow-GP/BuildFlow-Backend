const express = require('express');
const jwt = require('jsonwebtoken');
const { User, Office, Company, Project } = require('../models');
const router = express.Router();

// Middleware to authenticate JWT
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// GET /api/profile
router.get('/', authenticate, async (req, res) => {
  const { userId, userType } = req.user;

  try {
    let user;

    switch (userType) {
      case 'Individual':
        user = await User.findByPk(userId, { include: [Project] });
        break;
      case 'Office':
        user = await Office.findByPk(userId, { include: [Project] });
        break;
      case 'Company':
        user = await Company.findByPk(userId, { include: [Project] });
        break;
      default:
        return res.status(400).json({ error: 'Invalid user type' });
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
