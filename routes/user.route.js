// routes/user.js
const express = require('express');
const router = express.Router();
const { User, Project, Company, Office } = require('../models');
const authenticate = require('../middleware/authenticate');

// Define BASE_URL for constructing image URLs
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Get user profile by ID (must be authenticated)
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: {  },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.post('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, id_number, bank_account, location } = req.body;
    const [updated] = await User.update({
      name, email, phone, id_number, bank_account, location
    }, { where: { id: userId } });

    if (!updated) return res.status(404).json({ error: 'User not found or not updated' });

    const updatedUser = await User.findByPk(userId, {
      attributes: { },
    });
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Endpoint جديد ---
// GET /api/users/:userId - جلب بروفايل مستخدم معين بواسطة الـ ID (عام، لا يتطلب توثيق مبدئياً)
// إذا أردتِ جعله يتطلب توثيقاً، أضيفي authenticate middleware
router.get('/:userId', async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.userId, 10);
    if (isNaN(requestedUserId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findByPk(requestedUserId, {
      attributes: { exclude: ['password_hash', 'bank_account', 'id_number'] }, // استبعاد المعلومات الحساسة
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const formattedUser = {
      ...user.dataValues,
      profile_image: user.profile_image
        ? `${BASE_URL}/${user.profile_image.replace(/\\/g, '/')}`
        : null,
    };
    res.json(formattedUser);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});



// GET /api/users/me/projects - جلب مشاريع المستخدم الحالي المسجل
router.get('/me/projects', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const baseUrl =  'http://localhost:5000/';

    const userProjects = await Project.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Office,
          as: 'office',
          attributes: ['id', 'name', 'profile_image'],
          required: false
        },
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'profile_image'],
          required: false
        }
      ]
    });

    if (!userProjects || userProjects.length === 0) {
      return res.json([]);
    }

    // تعديل روابط الصور قبل الإرسال
    const updatedProjects = userProjects.map(project => {
      const p = project.toJSON();

      if (p.office && p.office.profile_image) {
        p.office.profile_image = baseUrl + p.office.profile_image;
      }

      if (p.company && p.company.profile_image) {
        p.company.profile_image = baseUrl + p.company.profile_image;
      }

      return p;
    });

    res.json(updatedProjects);

  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ message: 'Failed to fetch your projects.' });
  }
});

module.exports = router;
