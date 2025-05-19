const express = require('express');
const router = express.Router();
const { ProjectDesign } = require('../models');

// POST /api/project-designs/:projectId
router.post('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const {
    floor_count,
    bedrooms,
    bathrooms,
    kitchens,
    balconies,
    special_rooms,
    directional_rooms,
    kitchen_type,
    master_has_bathroom,
    general_description,
    interior_design,
    room_distribution
  } = req.body;

  try {
    const design = await ProjectDesign.create({
      project_id: projectId,
      floor_count,
      bedrooms,
      bathrooms,
      kitchens,
      balconies,
      special_rooms,
      directional_rooms,
      kitchen_type,
      master_has_bathroom,
      general_description,
      interior_design,
      room_distribution
    });
    res.status(201).json(design);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/project-designs/:projectId
router.get('/:projectId', async (req, res) => {
  const { projectId } = req.params;

  try {
    const design = await ProjectDesign.findOne({
      where: { project_id: projectId }
    });

    if (!design) {
      return res.status(404).json({ error: 'Design not found for this project' });
    }

    res.json(design);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
