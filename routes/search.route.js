const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Office, Company, Project } = require('../models');

// /api/search/:type?q=searchTerm
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  const { q } = req.query;

  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

  try {
    let results;

    switch (type) {
      case 'user':
        results = await User.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${q}%` } },
              { email: { [Op.iLike]: `%${q}%` } },
              { location: { [Op.iLike]: `%${q}%` } },
            ],
          },
        });
        break;

      case 'office':
        results = await Office.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${q}%` } },
              { email: { [Op.iLike]: `%${q}%` } },
              { location: { [Op.iLike]: `%${q}%` } },
            ],
          },
        });
        break;

      case 'company':
        results = await Company.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${q}%` } },
              { email: { [Op.iLike]: `%${q}%` } },
              { location: { [Op.iLike]: `%${q}%` } },
            ],
          },
        });
        break;

      case 'project':
        results = await Project.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${q}%` } },
              { description: { [Op.iLike]: `%${q}%` } },
            ],
          },
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid search type' });
    }

    return res.json({ results });
  } catch (error) {
    console.error('Search Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
