// routes/office.js or routes/api.js

const express = require('express');
const { Office } = require('../models');
const router = express.Router();

// GET /api/offices/suggestions
router.get('/offices/suggestions', async (req, res) => {
  try {
    const offices = await Office.findAll({
      limit: 10,
      order: [['rating', 'DESC']],
      attributes: ['id', 'name', 'location', 'profile_image', 'rating'],
    });

    res.json({ offices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch office suggestions' });
  }
});


router.get('/suggestions', async (req, res) => {
  try {
    const offices = await Office.findAll({
      where: { is_available: true },
      limit: 10,
    });
    res.json(offices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


module.exports = router;
