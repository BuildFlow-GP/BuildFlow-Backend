const express = require('express');
const router = express.Router();
const { companies } = require('../models');
const authenticateToken = require('../middleware/authenticateToken');

// Get company profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = req.user.userId;

    if (userType !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const company = await companies.findByPk(userId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    res.json(company);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update company profile (with or without image)
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = req.user.userId;

    if (userType !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await companies.update(req.body, {
      where: { id: userId },
      returning: true,
    });

    res.json(updated[1][0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
