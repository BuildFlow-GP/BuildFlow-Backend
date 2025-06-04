// models/notification.model.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('notifications', { // اسم الجدول كما هو في SQL
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    recipient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the user, office, or company receiving the notification',
    },
    recipient_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['individual', 'office', 'company']], // القيم المسموح بها
      },
      comment: 'Type of the recipient (user, office, company)',
    },
    actor_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // قد لا يكون هناك فاعل مباشر لبعض الإشعارات النظامية
      comment: 'ID of the user, office, or company that triggered the notification',
    },
    actor_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['individual', 'office', 'company', null]], // السماح بـ null
      },
      comment: 'Type of the actor (user, office, company)',
    },
    notification_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'e.g., NEW_PROJECT_REQUEST, PROJECT_APPROVED, MESSAGE_RECEIVED',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'The content of the notification message',
    },
    target_entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // قد لا يكون الإشعار مرتبطاً بكيان معين دائماً
      comment: 'ID of the entity this notification refers to (e.g., project_id)',
    },
    target_entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['project', 'review', 'user_profile', 'office_profile', 'company_profile', null]], // أمثلة
      },
      comment: 'Type of the target entity (project, review, etc.)',
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    read_at: {
      type: DataTypes.DATE, // أو TIMESTAMPTZ إذا كنتِ تستخدمينها في SQL
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    }
  }, {
    timestamps: false, // لأن created_at و read_at معرفة يدوياً
    underscored: true, // إذا كنتِ تفضلين created_at بدلاً من createdAt في أسماء الأعمدة الفعلية
    tableName: 'notifications', // تأكيد اسم الجدول
    // indexes: [ // تم تعريفها في SQL، لكن يمكن إضافتها هنا أيضاً للتوثيق
    //   { fields: ['recipient_id', 'recipient_type'] },
    //   { fields: ['is_read'] }
    // ]
  });

  Notification.associate = (models) => {
    // هنا يمكن تعريف علاقات "مرنة" إذا أردتِ جلب تفاصيل الـ actor أو الـ target entity
    // ولكن هذا قد يكون معقداً ويتطلب hooks أو virtual fields في Sequelize.
    // الطريقة الأبسط هي أن يقوم الـ service في الـ backend بمعالجة جلب هذه التفاصيل.

    // مثال (نظري، قد يحتاج لتكييف):
    // Notification.belongsTo(models.User, {
    //   foreignKey: 'recipient_id',
    //   constraints: false, // لأن recipient_id ليس دائماً user_id
    //   as: 'recipientUser',
    //   // scope: { recipient_type: 'user' } // هذا قد لا يعمل مباشرة في belongsTo
    // });
    // Notification.belongsTo(models.Office, {
    //   foreignKey: 'recipient_id',
    //   constraints: false,
    //   as: 'recipientOffice',
    // });
    // ... وهكذا للـ actor
  };

  return Notification;
};