const express = require('express');
const router = express.Router();
const { Review, User, Company, Project, Office } = require('../models');
const authenticate = require('../middleware/authenticate');

// ===========================
// GET /reviews — All Reviews
// ===========================
router.get('/', async (req, res) => {
  try {
    const allReviews = await Review.findAll({
      include: [
        { model: User, attributes: ['id', 'name'], as: 'user' },
        { model: Company, attributes: ['id', 'name'], as: 'company' },
        { model: Project, attributes: ['id', 'name'], as: 'project' },
        { model: Office, attributes: ['id', 'name'], as: 'office' },
      ],
      order: [['reviewed_at', 'DESC']],
    });
    res.json(allReviews);
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// ===========================
// GET /reviews/:id — Single Review
// ===========================
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['id', 'name'], as: 'user' },
        { model: Company, attributes: ['id', 'name'], as: 'company' },
        { model: Project, attributes: ['id', 'name'], as: 'project' },
        { model: Office, attributes: ['id', 'name'], as: 'office' },
      ],
    });

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.json(review);
  } catch (error) {
    console.error('Error fetching review by ID:', error);
    res.status(500).json({ message: 'Failed to fetch review' });
  }
});

// ===========================
// POST /reviews — Create Review
// ===========================
router.post('/', authenticate, async (req, res) => {
  try {
    const { company_id, project_id, office_id, rating, comment } = req.body;

    // Require at least one of the three IDs
    if (!company_id && !project_id && !office_id) {
      return res.status(400).json({
        message: 'At least one of company_id, project_id, or office_id must be provided',
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating (1-5) is required' });
    }

    const newReview = await Review.create({
      user_id: req.user.id,
      company_id: company_id || null,
      project_id: project_id || null,
      office_id: office_id || null,
      rating,
      comment,
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to create review' });
  }
});

// ===========================
// PUT /reviews/:id — Update Review
// ===========================
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

// ===========================
// DELETE /reviews/:id — Delete Review
// ===========================
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

// ===========================
// GET /reviews/user/:userId — User Reviews
// ===========================
router.get('/user/:userId', async (req, res) => {
  try {
    const userReviews = await Review.findAll({
      where: { user_id: req.params.userId },
      include: [
        { model: Company, attributes: ['name'], as: 'company' },
        { model: Project, attributes: ['name'], as: 'project' },
        { model: Office, attributes: ['name'], as: 'office' },
      ],
    });
    res.json(userReviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ message: 'Failed to fetch user reviews' });
  }
});

// ===========================
// GET /reviews/company/:companyId — Company Reviews
// ===========================
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

// ===========================
// GET /reviews/project/:projectId — Project Reviews
// ===========================
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

// ===========================
// GET /reviews/office/:officeId — Office Reviews
// ===========================
router.get('/office/:officeId', async (req, res) => {
  try {
    const officeReviews = await Review.findAll({
      where: { office_id: req.params.officeId },
      include: [{ model: User, attributes: ['name'], as: 'user' }],
    });
    res.json(officeReviews);
  } catch (error) {
    console.error('Error fetching office reviews:', error);
    res.status(500).json({ message: 'Failed to fetch office reviews' });
  }
});

module.exports = router;
