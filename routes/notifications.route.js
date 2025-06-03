// routes/notification.route.js
const express = require('express');
const router = express.Router();
const { Notification, User, Office, Company } = require('../models'); // افترض أن db.Notification هو Notification هنا
const authenticate = require('../middleware/authenticate'); // middleware التوثيق الخاص بك

// Helper function to get actor details (you can move this to a service/helper file)
async function getActorDetails(actorId, actorType) {
  if (!actorId || !actorType) return null;
  let actor = null;
  const attributes = ['id', 'name', 'profile_image']; // Common attributes

  try {
    if (actorType.toLowerCase() === 'user') {
      actor = await User.findByPk(actorId, { attributes });
    } else if (actorType.toLowerCase() === 'office') {
      actor = await Office.findByPk(actorId, { attributes });
    } else if (actorType.toLowerCase() === 'company') {
      actor = await Company.findByPk(actorId, { attributes });
    }
  } catch (error) {
    console.error(`Error fetching actor details for ${actorType} ${actorId}:`, error);
    // Don't let this error stop the whole notification process
  }
  return actor ? { ...actor.toJSON(), type: actorType.toLowerCase() } : null;
}


// ==============================================================
// 1. GET /api/notifications/my (أو /api/users/me/notifications)
//    لجلب إشعارات المستخدم/المكتب الحالي
// ==============================================================
router.get('/my', authenticate, async (req, res) => {
  try {
    const recipientId = req.user.id; //  يتم تعيينه بواسطة authenticate middleware
    const recipientType = req.user.userType.toLowerCase(); //  'user', 'office', 'company'

    if (!recipientId || !recipientType) {
      return res.status(400).json({ message: 'Recipient information is missing from token.' });
    }
    
    // (اختياري) Pagination parameters
    const limit = parseInt(req.query.limit) || 20; // Default limit to 20
    const offset = parseInt(req.query.offset) || 0; // Default offset to 0

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: {
        recipient_id: recipientId,
        recipient_type: recipientType,
      },
      order: [['created_at', 'DESC']],
      limit: limit,
      offset: offset,
      // raw: true, // Using raw:true makes it harder to work with associations if you try them later
    });

    // إثراء الإشعارات بتفاصيل الـ actor
    const notificationsWithDetails = await Promise.all(
      notifications.map(async (notificationInstance) => {
        const notification = notificationInstance.toJSON(); // Get plain object
        const actor = await getActorDetails(notification.actor_id, notification.actor_type);
        // يمكنكِ هنا أيضاً جلب تفاصيل مبسطة للـ target_entity إذا أردتِ
        // const target = await getTargetDetails(notification.target_entity_id, notification.target_entity_type);
        return {
          ...notification,
          actor, // { id, name, profile_image, type } or null
          // target, // if you implement getTargetDetails
        };
      })
    );

    res.json({
        totalItems: count,
        notifications: notificationsWithDetails,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
});

// ==============================================================
// 2. PUT /api/notifications/:notificationId/read
//    لتعليم إشعار معين كمقروء
// ==============================================================
router.put('/:notificationId/read', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const recipientId = req.user.id;
    const recipientType = req.user.userType.toLowerCase();

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        recipient_id: recipientId,
        recipient_type: recipientType,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or you are not authorized to read it.' });
    }

    if (notification.is_read) {
      return res.status(200).json({ message: 'Notification was already marked as read.', notification });
    }

    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();

    // إثراء الإشعار بتفاصيل الـ actor قبل إرجاعه (اختياري)
    const notificationJSON = notification.toJSON();
    const actor = await getActorDetails(notificationJSON.actor_id, notificationJSON.actor_type);

    res.json({ message: 'Notification marked as read.', notification: {...notificationJSON, actor} });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read.' });
  }
});

// ==============================================================
// 3. PUT /api/notifications/mark-all-as-read
//    لتعليم جميع إشعارات المستخدم كمقروءة
// ==============================================================
router.put('/mark-all-as-read', authenticate, async (req, res) => {
  try {
    const recipientId = req.user.id;
    const recipientType = req.user.userType.toLowerCase();

    const [affectedCount] = await Notification.update( // update returns an array [affectedCount, affectedRows (for some DBs)]
      { is_read: true, read_at: new Date() },
      {
        where: {
          recipient_id: recipientId,
          recipient_type: recipientType,
          is_read: false, // فقط تحديث غير المقروءة
        },
        // returning: true, // For PostgreSQL, if you want the updated rows (might need individual updates for that with actor details)
      }
    );

    res.json({ message: `Successfully marked ${affectedCount} notifications as read.` , count: affectedCount });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read.' });
  }
});


// ==============================================================
// 4. GET /api/notifications/unread-count
//    لجلب عدد الإشعارات غير المقروءة (مفيد للـ badge)
// ==============================================================
router.get('/unread-count', authenticate, async (req, res) => {
    try {
      const recipientId = req.user.id;
      const recipientType = req.user.userType.toLowerCase();
  
      const count = await Notification.count({
        where: {
          recipient_id: recipientId,
          recipient_type: recipientType,
          is_read: false,
        },
      });
  
      res.json({ unreadCount: count });
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      res.status(500).json({ message: 'Failed to fetch unread notification count.' });
    }
  });


// ==============================================================
// (للاستخدام الداخلي في الـ Backend أو لأغراض خاصة)
// 5. POST /api/notifications - لإنشاء إشعار جديد
//    عادةً، هذا لا يتم استدعاؤه مباشرة من الـ frontend،
//    بل يتم إنشاؤه من خلال services أخرى في الـ backend
//    عند وقوع أحداث معينة (مثل إنشاء طلب مشروع).
//    إذا احتجتِ لاستدعائه من Flutter (مثلاً لإرسال إشعار مخصص)،
//    يجب إضافة authenticate middleware وربما صلاحيات.
// ==============================================================
router.post('/', /* authenticate (إذا كان مسموحاً للمستخدمين بإنشاء إشعارات), */ async (req, res) => {
  try {
    const {
      recipient_id,
      recipient_type,
      actor_id,
      actor_type,
      notification_type,
      message,
      target_entity_id,
      target_entity_type,
    } = req.body;

    // التحقق من الحقول المطلوبة
    if (!recipient_id || !recipient_type || !notification_type || !message) {
      return res.status(400).json({ message: 'Missing required fields for notification.' });
    }

    const newNotification = await Notification.create({
      recipient_id,
      recipient_type: recipient_type.toLowerCase(),
      actor_id,
      actor_type: actor_type ? actor_type.toLowerCase() : null,
      notification_type,
      message,
      target_entity_id,
      target_entity_type: target_entity_type ? target_entity_type.toLowerCase() : null,
    });
    
    // هنا يمكنكِ أيضاً إرسال إشعار فوري (Push Notification) إذا كان النظام يدعم ذلك
    // (e.g., using Firebase Cloud Messaging)

    res.status(201).json(newNotification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Failed to create notification.' });
  }
});


// ==============================================================
// (اختياري)
// 6. DELETE /api/notifications/:notificationId
//    لحذف إشعار معين (إذا أردتِ السماح للمستخدم بحذف الإشعارات)
// ==============================================================
router.delete('/:notificationId', authenticate, async (req, res) => {
    try {
      const { notificationId } = req.params;
      const recipientId = req.user.id;
      const recipientType = req.user.userType.toLowerCase();
  
      const result = await Notification.destroy({
        where: {
          id: notificationId,
          recipient_id: recipientId, // تأكد أن المستخدم يحذف إشعاره فقط
          recipient_type: recipientType,
        },
      });
  
      if (result > 0) {
        res.status(200).json({ message: 'Notification deleted successfully.' });
      } else {
        res.status(404).json({ message: 'Notification not found or you are not authorized to delete it.' });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Failed to delete notification.' });
    }
  });


module.exports = router;