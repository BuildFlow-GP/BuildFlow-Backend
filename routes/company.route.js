const express = require('express');
const router = express.Router();
const { Company } = require('../models');
const authenticateToken = require('../middleware/authenticate');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Get company profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const company = await Company.findByPk(userId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    res.json(company);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update company profile (with or without image)
router.post('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;


    const updated = await Company.update(req.body, {
      where: { id: userId },
      returning: true,
    });

    res.json(updated[1][0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});



// GET /api/companies/allcompanies
router.get('/allcompanies', async (req, res) => {
  try {
    const companies = await Company.findAll({
      limit: 10,
      attributes: {
        exclude: ['password_hash'], // نخفي كلمة السر
      },
    });

    const formattedCompanies = companies.map(company => ({
      ...company.dataValues,
      profile_image: company.profile_image
        ? `${BASE_URL}/${company.profile_image.replace(/\\/g, '/')}`
        : '',
    }));

    res.json(formattedCompanies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/companies/suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const companies = await Company.findAll({
      limit: 10,
      order: [['rating', 'DESC']],
      attributes: ['id', 'name', 'profile_image', 'rating'],
    });

    const formatted = companies.map(company => ({
      ...company.dataValues,
      profile_image: company.profile_image
        ? `${BASE_URL}/${company.profile_image.replace(/\\/g, '/')}`
        : '',
    }));

    res.json({ companies: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch company suggestions' });
  }
});


module.exports = router;
