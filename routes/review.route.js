const express = require('express');
const router = express.Router();
const { reviews, userss, companies, projects } = require('../models');
const authenticate = require('../middleware/authenticate');

// ✅ GET /reviews — جلب كل التقييمات
router.get('/', async (req, res) => {
  try {
    const allReviews = await reviews.findAll({
      include: [
        { model: userss, attributes: ['id', 'name'], as: 'user' },
        { model: companies, attributes: ['id', 'name'], as: 'company' },
        { model: projects, attributes: ['id', 'name'], as: 'project' },
      ],
      order: [['reviewed_at', 'DESC']]
    });
    res.json(allReviews);
  } catch (err) {
    console.error('Get all reviews error:', err);
    res.status(500).json({ message: 'خطأ في جلب التقييمات' });
  }
});

// ✅ GET /reviews/:id — جلب تقييم حسب ID
router.get('/:id', async (req, res) => {
  try {
    const review = await reviews.findByPk(req.params.id, {
      include: [
        { model: userss, attributes: ['id', 'name'], as: 'user' },
        { model: companies, attributes: ['id', 'name'], as: 'company' },
        { model: projects, attributes: ['id', 'name'], as: 'project' },
      ]
    });

    if (!review) return res.status(404).json({ message: 'التقييم غير موجود' });

    res.json(review);
  } catch (err) {
    console.error('Get review by ID error:', err);
    res.status(500).json({ message: 'خطأ في جلب التقييم' });
  }
});

// ✅ POST /reviews — إنشاء تقييم جديد
router.post('/', authenticate, async (req, res) => {
  try {
    const { company_id, project_id, rating, comment } = req.body;

    if (!company_id || !project_id || !rating) {
      return res.status(400).json({ message: 'يجب إدخال الشركة والمشروع والتقييم' });
    }

    const newReview = await reviews.create({
      user_id: req.user.id,
      company_id,
      project_id,
      rating,
      comment,
    });

    res.status(201).json(newReview);
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ message: 'فشل في إنشاء التقييم' });
  }
});

// ✅ PUT /reviews/:id — تعديل تقييم
router.put('/:id', authenticate, async (req, res) => {
  try {
    const review = await reviews.findByPk(req.params.id);

    if (!review) return res.status(404).json({ message: 'التقييم غير موجود' });

    if (review.user_id !== req.user.id) {
      return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا التقييم' });
    }

    const { rating, comment } = req.body;

    await review.update({ rating, comment });
    res.json({ message: 'تم تعديل التقييم بنجاح', review });
  } catch (err) {
    console.error('Update review error:', err);
    res.status(500).json({ message: 'فشل في تحديث التقييم' });
  }
});

// ✅ DELETE /reviews/:id — حذف تقييم
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const review = await reviews.findByPk(req.params.id);

    if (!review) return res.status(404).json({ message: 'التقييم غير موجود' });

    if (review.user_id !== req.user.id) {
      return res.status(403).json({ message: 'غير مصرح لك بحذف هذا التقييم' });
    }

    await review.destroy();
    res.json({ message: 'تم حذف التقييم بنجاح' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ message: 'فشل في حذف التقييم' });
  }
});

// ✅ GET /reviews/user/:userId — تقييمات مستخدم معين
router.get('/user/:userId', async (req, res) => {
  try {
    const userReviews = await reviews.findAll({
      where: { user_id: req.params.userId },
      include: [{ model: companies, attributes: ['name'], as: 'company' }]
    });
    res.json(userReviews);
  } catch (err) {
    console.error('User reviews error:', err);
    res.status(500).json({ message: 'فشل في جلب تقييمات المستخدم' });
  }
});

// ✅ GET /reviews/company/:companyId — تقييمات شركة معينة
router.get('/company/:companyId', async (req, res) => {
  try {
    const companyReviews = await reviews.findAll({
      where: { company_id: req.params.companyId },
      include: [{ model: userss, attributes: ['name'], as: 'user' }]
    });
    res.json(companyReviews);
  } catch (err) {
    console.error('Company reviews error:', err);
    res.status(500).json({ message: 'فشل في جلب تقييمات الشركة' });
  }
});

// ✅ GET /reviews/project/:projectId — تقييمات مشروع معين
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectReviews = await reviews.findAll({
      where: { project_id: req.params.projectId },
      include: [{ model: userss, attributes: ['name'], as: 'user' }]
    });
    res.json(projectReviews);
  } catch (err) {
    console.error('Project reviews error:', err);
    res.status(500).json({ message: 'فشل في جلب تقييمات المشروع' });
  }
});

module.exports = router;
