const express = require('express');
const router = express.Router();
const { Review,User,Company, Project } = require('../models');
const authenticate = require('../middleware/authenticate');

// GET /reviews — Retrieve all reviews
router.get('/', async (req, res) => {
  try {
    const allReviews = await Review.findAll({
      include: [
        { model: User, attributes: ['id', 'name'], as: 'user' },
        { model: Company, attributes: ['id', 'name'], as: 'company' },
        { model: Project, attributes: ['id', 'name'], as: 'project' },
      ],
      order: [['reviewed_at', 'DESC']],
    });
    res.json(allReviews);
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// GET /reviews/:id — Retrieve a review by ID
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['id', 'name'], as: 'user' },
        { model: Company, attributes: ['id', 'name'], as: 'company' },
        { model: Project, attributes: ['id', 'name'], as: 'project' },
      ],
    });

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.json(review);
  } catch (error) {
    console.error('Error fetching review by ID:', error);
    res.status(500).json({ message: 'Failed to fetch review' });
  }
});

// POST /reviews — Create a new review (authentication required)
router.post('/', authenticate, async (req, res) => {
  try {
    const { company_id, project_id, rating, comment } = req.body;

    if (!company_id || !project_id || !rating) {
      return res.status(400).json({ message: 'Company, project, and rating are required' });
    }

    const newReview = await Review.create({
      user_id: req.user.id,
      company_id,
      project_id,
      rating,
      comment,
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to create review' });
  }
});

// PUT /reviews/:id — Update a review (only by review owner)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);

    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (review.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    const { rating, comment } = req.body;

    await review.update({ rating, comment });
    res.json({ message: 'Review updated successfully', review });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Failed to update review' });
  }
});

// DELETE /reviews/:id — Delete a review (only by review owner)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);

    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (review.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.destroy();
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

// GET /reviews/user/:userId — Get all reviews written by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const userReviews = await Review.findAll({
      where: { user_id: req.params.userId },
      include: [{ model: Company, attributes: ['name'], as: 'company' }],
    });
    res.json(userReviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ message: 'Failed to fetch user reviews' });
  }
});

// GET /reviews/company/:companyId — Get all reviews for a specific company
router.get('/company/:companyId', async (req, res) => {
  try {
    const companyReviews = await Review.findAll({
      where: { company_id: req.params.companyId },
      include: [{ model: User, attributes: ['name'], as: 'user' }],
    });
    res.json(companyReviews);
  } catch (error) {
    console.error('Error fetching company reviews:', error);
    res.status(500).json({ message: 'Failed to fetch company reviews' });
  }
});

// GET /reviews/project/:projectId — Get all reviews for a specific project
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectReviews = await Review.findAll({
      where: { project_id: req.params.projectId },
      include: [{ model: User, attributes: ['name'], as: 'user' }],
    });
    res.json(projectReviews);
  } catch (error) {
    console.error('Error fetching project reviews:', error);
    res.status(500).json({ message: 'Failed to fetch project reviews' });
  }
});

module.exports = router;
