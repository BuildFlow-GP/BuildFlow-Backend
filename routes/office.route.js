// routes/office.js or routes/api.js
const authenticate = require('../middleware/authenticate');
const express = require('express');
const { Review,Office,Project, User, Company } = require('../models');
const router = express.Router();
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
//const multer = require('multer');
//const upload = multer({ dest: 'uploads/' });
const upload = require('../middleware/upload');

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
    res.json({ offices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch office suggestions' });
  }
});


// GET /api/alloffices
router.get('/alloffices', async (req, res) => {
  try {
    const office = await Office.findAll({
      where: { is_available: true },
      limit: 10,
      attributes: {},
    });

    const offices = office.map(office => ({
      ...office.dataValues,
      profile_image: office.profile_image
        ? `${BASE_URL}/${office.profile_image.replace(/\\/g, '/')}`
        : '',
    }));

    res.json(offices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/test', (req, res) => {
  res.send('Office route is working');
});

// Add review for a specific office
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const office_id = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating (1–5) is required' });
    }

    const office = await Office.findByPk(office_id);
    if (!office) return res.status(404).json({ message: 'Office not found' });

    const review = await Review.create({
      user_id: req.user.id,
      office_id,
      rating,
      comment,
    });

    res.status(201).json({ message: 'Review created', review });
  } catch (error) {
    console.error('Error adding office review:', error);
    res.status(500).json({ message: 'Failed to create office review' });
  }
});

// PUT /api/offices/:id — Update Office Data
router.put('/offices/:id', authenticate, async (req, res) => {
  try {
    const officeId = req.params.id;
    const updateData = req.body;

    // إيجاد المكتب
    const office = await Office.findByPk(officeId);
    if (!office) return res.status(404).json({ message: 'Office not found' });

   
     if (office.id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    // تحديث المكتب بالبيانات الجديدة
    // استبعد الحقول المحظورة مثل id, created_at إذا حابب
    const allowedFields = [
      'name',
      'email',
      'phone',
      'location',
      'capacity',
      'rating',
      'is_available',
      'points',
      'bank_account',
      'staff_count',
      'active_projects_count',
      'branches',
      'profile_image',
    'password_hash',
  ];

    // تصفية البيانات للسماح فقط للحقول المسموح تحديثها
    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) filteredData[field] = updateData[field];
    });

    await office.update(filteredData);

    res.json({ message: 'Office updated successfully', office });
  } catch (error) {
    console.error('Error updating office:', error);
    res.status(500).json({ message: 'Failed to update office' });
  }
});



router.post('/offices/:id/upload-image', authenticate, upload.single('profile_image'), async (req, res) => {
  try {
    const office = await Office.findByPk(req.params.id);
    if (!office) return res.status(404).json({ message: 'Office not found' });

    // تأكد أن المستخدم يملك هذا المكتب
    if (office.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // تحديث مسار الصورة في قاعدة البيانات
    office.profile_image = `uploads/${req.file.filename}`;
    await office.save();

    res.json({
      message: 'Image uploaded',
      profile_image_url: `${BASE_URL}/uploads/${req.file.filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

// GET /api/offices/:id
router.get('/offices/:id', async (req, res) => {
  try {
    const office = await Office.findByPk(req.params.id);

    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }

   // تعديل مسار الصورة إذا موجود
    const profileImageUrl = office.profile_image
      ? `${BASE_URL}/${office.profile_image.replace(/\\/g, '/')}`
      : '';

    res.json({
      ...office.dataValues,
      profile_image: profileImageUrl,
    });
  } catch (error) {
    console.error('Error fetching office by ID:', error);
    res.status(500).json({ message: 'Failed to fetch office' });
  }
});

// في ملف routes/office.js أو ملف مناسب

router.get('/:officeId/officeprojects', async (req, res) => {
  try {
    const officeId = req.params.officeId;
    const office = await Office.findByPk(officeId);
    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }

    // افترض أن لديك علاقة بين Office و Project
    // مثلاً، Project.findAll({ where: { office_id: officeId } })
    // أو إذا كانت العلاقة معرفة في Sequelize:
    const projects = await Project.findAll({
      where: { office_id: officeId }, // أو اسم الحقل الصحيح الذي يربط المشروع بالمكتب
      order: [['created_at', 'DESC']], // مثال لترتيب المشاريع
      include: [ // يمكنك تضمين معلومات إضافية إذا أردت
        // { model: User, as: 'client', attributes: ['id', 'name'] }, // مثال
      ],
      // اختاري الحقول التي تحتاجينها فقط للمشروع في القائمة
      attributes: ['id', 'name', 'status', 'start_date', 'end_date', /* 'project_cover_image' إذا وجد */],
    });

    const formattedProjects = projects.map(project => ({
      ...project.dataValues,
      // project_cover_image: project.project_cover_image ? `${BASE_URL}/${project.project_cover_image}` : null,
    }));

    res.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching office projects:', error);
    res.status(500).json({ message: 'Failed to fetch office projects' });
  }
});



// في ملف routes/office.js أو ملف مناسب

router.get('/:officeId/officereviews', async (req, res) => {
  try {
    const officeId = req.params.officeId;
    const office = await Office.findByPk(officeId);
    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }

    const reviews = await Review.findAll({
      where: { office_id: officeId },
      include: [
        {
          model: User, // افترض أن Review مرتبط بـ User
          as: 'user', // أو الاسم المستخدم في تعريف العلاقة
          attributes: ['id', 'name', 'profile_image'], // الحقول التي تريدينها من المستخدم
        },
      ],
      order: [['reviewed_at', 'DESC']],
    });

    // معالجة صورة المستخدم في كل مراجعة
    const formattedReviews = reviews.map(review => {
      const user = review.user ? {
        ...review.user.dataValues,
        profile_image: review.user.profile_image ? `${BASE_URL}/${review.user.profile_image.replace(/\\/g, '/')}` : null,
      } : null;

      return {
        ...review.dataValues,
        user: user, // إرجاع معلومات المستخدم المعالجة
      };
    });

    res.json(formattedReviews);
  } catch (error) {
    console.error('Error fetching office reviews:', error);
    res.status(500).json({ message: 'Failed to fetch office reviews' });
  }
});

module.exports = router;
