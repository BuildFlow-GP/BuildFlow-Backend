// company.route.js (مُحدَّث)
const express = require('express');
const router = express.Router();
const { Company, Project, Review, User } = require('../models'); 
const authenticateToken = require('../middleware/authenticate'); 
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
// const upload = require('../middleware/upload'); // إذا كنتِ ستضيفين رفع صور للشركة


// GET /api/companies/me - Get current company's profile (based on token)
// ملاحظة: هذا يعتمد على أن Company.id هو نفسه User.id للمستخدم من نوع شركة.
// إذا كان هناك حقل user_id في جدول Companies يربطها بجدول Users، سيكون أفضل.
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // ID المستخدم من التوكن

    // افترض أن جدول الشركات فيه حقل 'id' هو المفتاح الأساسي للشركة
    // وأن هذا الـ id هو نفسه الـ userId للمستخدم من نوع شركة.
    // إذا كان هناك حقل `user_id` في جدول `companies` يربطها بالـ user،
    // يجب البحث بناءً عليه: const company = await Company.findOne({ where: { user_id: userId } });
    const company = await Company.findByPk(userId, {
      attributes: { exclude: ['password_hash'] } // استبعاد كلمة المرور
    });

    if (!company) return res.status(404).json({ error: 'Company not found for this user' });

    const formattedCompany = {
      ...company.dataValues,
      profile_image: company.profile_image
        ? `${BASE_URL}/${company.profile_image.replace(/\\/g, '/')}`
        : null, // أو '' إذا كنتِ تفضلين سلسلة فارغة
    };
    res.json(formattedCompany);
  } catch (err) {
    console.error('Error fetching current company profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/companies/me - Update current company's profile
// ملاحظة: تم تغييرها إلى PUT لتكون RESTful أكثر لعمليات التحديث.
// وأيضاً، عادةً ما يتم فصل رفع الصور عن تحديث البيانات النصية.
router.put('/me', authenticateToken, async (req, res) => { // غيرت إلى PUT
  try {
    const userId = req.user.id; // ID المستخدم من التوكن
    const updateData = req.body;

    // إزالة الحقول التي لا يجب أن يحدثها المستخدم مباشرة أو التي قد تسبب مشاكل
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.rating; // التقييم يجب أن يحسب بناءً على المراجعات
    delete updateData.password_hash; // تحديث كلمة المرور يجب أن يكون له مسار خاص وآمن

    // نفس الملاحظة السابقة حول البحث عن الشركة
    const [numberOfAffectedRows, affectedRows] = await Company.update(updateData, {
      where: { id: userId }, // أو where: { user_id: userId }
      returning: true, // مهم لـ PostgreSQL لإرجاع السجلات المحدثة
    });

    if (numberOfAffectedRows > 0 && affectedRows && affectedRows.length > 0) {
      const company = affectedRows[0];
      const formattedCompany = {
        ...company.dataValues,
        profile_image: company.profile_image
          ? `${BASE_URL}/${company.profile_image.replace(/\\/g, '/')}`
          : null,
      };
      // استبعاد كلمة المرور من الاستجابة
      delete formattedCompany.password_hash;
      res.json(formattedCompany);
    } else {
      res.status(404).json({ error: 'Company not found or no changes made' });
    }
  } catch (err) {
    console.error('Error updating company profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/companies/allcompanies
router.get('/allcompanies', async (req, res) => {
  try {
    const companies = await Company.findAll({
      limit: 10, // يمكنك جعل هذا كـ query parameter (req.query.limit)
      attributes: { exclude: ['password_hash'] },
    });

    const formattedCompanies = companies.map(company => ({
      ...company.dataValues,
      profile_image: company.profile_image
        ? `${BASE_URL}/${company.profile_image.replace(/\\/g, '/')}`
        : null,
    }));

    res.json(formattedCompanies);
  } catch (err) {
    console.error('Error fetching all companies:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/companies/suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const companies = await Company.findAll({
      limit: 10,
      order: [['rating', 'DESC']], // تأكدي أن حقل 'rating' يتم تحديثه بشكل صحيح في جدول Companies
      attributes: ['id', 'name', 'profile_image', 'rating', 'company_type', 'location'], // أضفت company_type و location
    });

    const formatted = companies.map(company => ({
      ...company.dataValues,
      profile_image: company.profile_image
        ? `${BASE_URL}/${company.profile_image.replace(/\\/g, '/')}`
        : null,
    }));

    res.json({ companies: formatted }); // يفضل إرجاع كائن يحتوي على المفتاح companies
  } catch (err) {
    console.error('Error fetching company suggestions:', err);
    res.status(500).json({ error: 'Failed to fetch company suggestions' });
  }
});


// --- الـ Endpoints الجديدة المطلوبة لصفحة بروفايل الشركة ---

// GET /api/companies/:companyId - جلب تفاصيل شركة معينة
router.get('/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID format' });
    }

    const company = await Company.findByPk(companyId, {
      attributes: { exclude: ['password_hash'] } // استبعاد كلمة المرور
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const formattedCompany = {
      ...company.dataValues,
      profile_image: company.profile_image
        ? `${BASE_URL}/${company.profile_image.replace(/\\/g, '/')}`
        : null,
    };
    res.json(formattedCompany);
  } catch (error) {
    console.error('Error fetching company by ID:', error);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
});

// GET /api/companies/:companyId/projects - جلب مشاريع شركة معينة
router.get('/:companyId/projects', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID format' });
    }

    const companyExists = await Company.findByPk(companyId);
    if (!companyExists) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const projects = await Project.findAll({
      where: { company_id: companyId }, // بناءً على العلاقة التي عرفتيها
      order: [['created_at', 'DESC']], // أو أي ترتيب آخر
      attributes: ['id', 'name', 'status', 'description', 'start_date', 'end_date', /* أي حقول أخرى مهمة */ ],
      // يمكنك إضافة include هنا إذا أردتِ معلومات إضافية عن كل مشروع
    });

    // يمكنك معالجة الصور للمشاريع هنا إذا لزم الأمر
    const formattedProjects = projects.map(project => ({
        ...project.dataValues,
        // project_image: project.project_image ? `${BASE_URL}/${project.project_image}` : null
    }));

    res.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching company projects:', error);
    res.status(500).json({ message: 'Failed to fetch company projects' });
  }
});

// GET /api/companies/:companyId/reviews - جلب مراجعات شركة معينة
router.get('/:companyId/reviews', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID format' });
    }

    const companyExists = await Company.findByPk(companyId);
    if (!companyExists) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const reviews = await Review.findAll({
      where: { company_id: companyId }, // بناءً على العلاقة التي عرفتيها
      include: [
        {
          model: User,
          as: 'user', // الاسم المستخدم في تعريف العلاقة db.Review.belongsTo(db.User, { as: 'user' })
          attributes: ['id', 'name', 'profile_image'], // الحقول المطلوبة من المستخدم
        },
      ],
      order: [['reviewed_at', 'DESC']], // ترتيب حسب تاريخ المراجعة
    });

    const formattedReviews = reviews.map(review => {
      const user = review.user ? {
        ...review.user.dataValues,
        profile_image: review.user.profile_image
          ? `${BASE_URL}/${review.user.profile_image.replace(/\\/g, '/')}`
          : null,
      } : null;
      return {
        ...review.dataValues,
        user: user,
      };
    });

    res.json(formattedReviews);
  } catch (error) {
    console.error('Error fetching company reviews:', error);
    res.status(500).json({ message: 'Failed to fetch company reviews' });
  }
});

// POST /api/companies/:companyId/review - إضافة مراجعة لشركة معينة
router.post('/:companyId/review', authenticateToken, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID format' });
    }

    const { rating, comment } = req.body;
    const userId = req.user.id; // ID المستخدم من التوكن

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating (1–5) is required' });
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // اختياري: منع المستخدم من تقييم شركته الخاصة (إذا كان company.id هو نفسه user.id)
    // أو إذا كان company.user_id (إذا وجد) == userId
    // if (company.id === userId) { // أو company.user_id === userId
    //   return res.status(403).json({ message: "You cannot review your own company." });
    // }

    const newReview = await Review.create({
      user_id: userId,
      company_id: companyId,
      rating: rating,
      comment: comment,
      // reviewed_at سيتم تعيينه بالقيمة الافتراضية DataTypes.NOW
    });

    // جلب المراجعة الجديدة مع معلومات المستخدم لعرضها بشكل متناسق
    const createdReview = await Review.findByPk(newReview.id, {
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'profile_image']
        }]
    });
    
    const formattedReview = {
        ...createdReview.dataValues,
        user: createdReview.user ? {
            ...createdReview.user.dataValues,
            profile_image: createdReview.user.profile_image ? `${BASE_URL}/${createdReview.user.profile_image}` : null
        } : null
    };


    // تحديث متوسط التقييم للشركة (هذا جزء مهم!)
    const allReviews = await Review.findAll({ where: { company_id: companyId }, attributes: ['rating'] });
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = allReviews.length > 0 ? (totalRating / allReviews.length) : null;
    
    if (averageRating !== null) {
        await Company.update({ rating: parseFloat(averageRating.toFixed(2)) }, { where: { id: companyId } });
    }


    res.status(201).json({ message: 'Review for company created successfully', review: formattedReview });
  } catch (error) {
    console.error('Error adding company review:', error);
    res.status(500).json({ message: 'Failed to add company review' });
  }
});


module.exports = router;