// models/userFavorite.model.js
module.exports = (sequelize, DataTypes) => {
  const UserFavorite = sequelize.define('user_favorites', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'userss', // اسم جدول المستخدمين كما هو في قاعدة البيانات
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    item_id: { // ID المكتب أو الشركة أو المشروع
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    item_type: { // 'office', 'company', 'project'
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['office', 'company', 'project']], // قصر القيم المسموح بها
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    timestamps: false, // لأننا عرفنا created_at يدوياً
    indexes: [ // لتحسين أداء الاستعلامات
      {
        unique: true, // لمنع إضافة نفس العنصر لنفس المستخدم أكثر من مرة
        fields: ['user_id', 'item_id', 'item_type']
      }
    ]
  });

  UserFavorite.associate = (models) => {
     // علاقة مع المستخدم
     UserFavorite.belongsTo(models.User, {
       foreignKey: 'user_id',
       as: 'user', // يمكن استخدامه في include
     });

     // علاقات "مرنة" مع العناصر الأخرى (لأن item_id يشير لجداول مختلفة)
     // هذه العلاقات مفيدة إذا أردتِ جلب تفاصيل العنصر المفضل مباشرة
     // ولكن يجب التعامل معها بحذر في الاستعلامات.
     // قد يكون من الأفضل جلب قائمة الـ IDs والـ types ثم جلب التفاصيل في طلبات منفصلة من الـ frontend.

     // UserFavorite.belongsTo(models.Office, {
     //   foreignKey: 'item_id',
     //   constraints: false, // مهم جداً لأن item_id ليس مفتاحاً خارجياً مباشراً لـ Office فقط
     //   as: 'officeItem',
     //   scope: { item_type: 'office' } // نظرياً، لكن Sequelize قد لا يدعم scope بهذه الطريقة مباشرة في belongsTo
     // });
     // UserFavorite.belongsTo(models.Company, {
     //   foreignKey: 'item_id',
     //   constraints: false,
     //   as: 'companyItem',
     //   scope: { item_type: 'company' }
     // });
     // UserFavorite.belongsTo(models.Project, {
     //   foreignKey: 'item_id',
     //   constraints: false,
     //   as: 'projectItem',
     //   scope: { item_type: 'project' }
     // });
  };

  return UserFavorite;
};