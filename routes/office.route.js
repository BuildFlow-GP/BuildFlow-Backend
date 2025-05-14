// routes/offices.js
const express = require('express');
const router = express.Router();
const { Office } = require('../models');

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
