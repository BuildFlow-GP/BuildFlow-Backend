// routes/favorite.route.js
const express = require('express');
const router = express.Router();
const { UserFavorite, Office, Company, Project } = require('../models');
const authenticate = require('../middleware/authenticate'); // middleware التوثيق

// POST /api/favorites - إضافة عنصر إلى المفضلة
router.post('/', authenticate, async (req, res) => {
  try {
    const { itemId, itemType } = req.body; // item_id و item_type
    const userId = req.user.id;

    if (!itemId || !itemType) {
      return res.status(400).json({ message: 'itemId and itemType are required.' });
    }

    // التحقق من أن itemType هو واحد من القيم المسموح بها
    const allowedTypes = ['office', 'company', 'project'];
    if (!allowedTypes.includes(itemType.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid itemType.' });
    }
    
    // التحقق من وجود العنصر قبل إضافته للمفضلة (اختياري ولكنه جيد)
    let itemExists = false;
    if (itemType.toLowerCase() === 'office') itemExists = await Office.findByPk(itemId);
    else if (itemType.toLowerCase() === 'company') itemExists = await Company.findByPk(itemId);
    else if (itemType.toLowerCase() === 'project') itemExists = await Project.findByPk(itemId);

    if (!itemExists) {
        return res.status(404).json({ message: `${itemType} with ID ${itemId} not found.` });
    }


    // التحقق مما إذا كان العنصر موجوداً بالفعل في مفضلات المستخدم
    const existingFavorite = await UserFavorite.findOne({
      where: {
        user_id: userId,
        item_id: itemId,
        item_type: itemType.toLowerCase(),
      },
    });

    if (existingFavorite) {
      return res.status(409).json({ message: 'Item already in favorites.' });
    }

    const favorite = await UserFavorite.create({
      user_id: userId,
      item_id: itemId,
      item_type: itemType.toLowerCase(),
    });

    res.status(201).json({ message: 'Added to favorites successfully.', favorite });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Item already in favorites (constraint).' });
    }
    res.status(500).json({ message: 'Failed to add to favorites.' });
  }
});

// DELETE /api/favorites - إزالة عنصر من المفضلة
// يمكنكِ استخدام query parameters هنا أو body
router.delete('/', authenticate, async (req, res) => {
  try {
    const { itemId, itemType } = req.query; // أو req.body إذا كنتِ تفضلين
    const userId = req.user.id;

    if (!itemId || !itemType) {
      return res.status(400).json({ message: 'itemId and itemType are required.' });
    }
    
    const item_id = parseInt(itemId, 10);
    if (isNaN(item_id)) {
         return res.status(400).json({ message: 'Invalid itemId format.' });
    }

    const result = await UserFavorite.destroy({
      where: {
        user_id: userId,
        item_id: item_id,
        item_type: itemType.toLowerCase(),
      },
    });

    if (result > 0) {
      res.status(200).json({ message: 'Removed from favorites successfully.' });
    } else {
      res.status(404).json({ message: 'Item not found in favorites or not authorized.' });
    }
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ message: 'Failed to remove from favorites.' });
  }
});

// GET /api/favorites - جلب قائمة مفضلات المستخدم الحالي
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await UserFavorite.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      // هنا الجزء الصعب إذا أردنا جلب تفاصيل العنصر المفضل مباشرة
      // الطريقة الأبسط هي إرجاع قائمة بالـ IDs والـ types، والـ frontend يجلب التفاصيل
    });

    // إذا أردتِ محاولة جلب التفاصيل (يتطلب تعريف علاقات `belongsTo` مع `constraints: false` في UserFavorite model)
    // وتحتاجين لطريقة لتمييز النوع عند عمل include.
    // الطريقة الأسهل للـ backend في هذه المرحلة هي إرجاع الـ IDs والـ types.
    // الـ Frontend سيحتاج لعمل طلبات إضافية بناءً على item_type لجلب تفاصيل كل عنصر.

    // مثال مبسط: إرجاع الـ IDs والـ Types
    const simplifiedFavorites = favorites.map(fav => ({
        id: fav.id, // id سجل المفضلة نفسه
        user_id: fav.user_id,
        item_id: fav.item_id,
        item_type: fav.item_type,
        created_at: fav.created_at
    }));

    res.json(simplifiedFavorites);

  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Failed to fetch favorites.' });
  }
});

module.exports = router;