// routes/user.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const authenticate = require('../middleware/authenticate');

// Get user profile by ID (must be authenticated)
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: {  },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.post('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, id_number, bank_account, location } = req.body;
    const [updated] = await User.update({
      name, email, phone, id_number, bank_account, location
    }, { where: { id: userId } });

    if (!updated) return res.status(404).json({ error: 'User not found or not updated' });

    const updatedUser = await User.findByPk(userId, {
      attributes: { },
    });
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
