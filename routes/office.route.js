// routes/office.js or routes/api.js

const express = require('express');
const { Office } = require('../models');
const router = express.Router();
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// GET /api/offices/suggestions
router.get('/offices/suggestions', async (req, res) => {
  try {
    const office = await Office.findAll({
      limit: 10,
      order: [['rating', 'DESC']],
      attributes: ['id', 'name', 'location', 'profile_image', 'rating'],
    });
 //  Convert relative image path to absolute URL
    const offices = office.map(office => ({
      ...office.dataValues,
      profile_image: office.profile_image
        ? `${BASE_URL}/${office.profile_image}`
        : '',
    }));
    res.json({ offices: office });
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


