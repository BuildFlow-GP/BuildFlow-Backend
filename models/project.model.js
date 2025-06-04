// models/project.model.js
module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('projects', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false }, // يمكن أن يكون اسم مبدئي أو نوع التصميم
    description: { type: DataTypes.TEXT, allowNull: true }, //  الوصف الكامل، قد يكون null مبدئياً
    status: { 
      type: DataTypes.STRING(50), 
      defaultValue: 'Pending Office Approval', //  الحالة الافتراضية للطلبات الجديدة
      allowNull: false,
      validate: { // إضافة validate للقيم المسموح بها للحالة
        isIn: [[
          'Pending Office Approval', 
          'Office Approved - Awaiting Details', 
          'Office Rejected',
          'Details Submitted - Pending Office Review', // أو ما شابه
          'Awaiting Payment Proposal',
          'Awaiting User Payment',
          'In Progress', 
          'Completed', 
          'Cancelled'
        ]]
      }
    },
    budget: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    start_date: { type: DataTypes.DATE, allowNull: true },
    end_date: { type: DataTypes.DATE, allowNull: true },
    location: { type: DataTypes.TEXT, allowNull: true },
    license_file: { type: DataTypes.TEXT, allowNull: true },
    agreement_file: { type: DataTypes.TEXT, allowNull: true },
    document_2d: { type: DataTypes.TEXT, allowNull: true },
    document_3d: { type: DataTypes.TEXT, allowNull: true },
    land_area: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    plot_number: { type: DataTypes.STRING(50), allowNull: true },
    basin_number: { type: DataTypes.STRING(50), allowNull: true },
    land_location: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    
    // === الحقول المضافة/المؤكدة ===
    user_id: { //  مفتاح خارجي لجدول المستخدمين
      type: DataTypes.INTEGER,
      allowNull: false, // يجب أن يكون كل مشروع مملوكاً لمستخدم
      references: {
        model: 'userss', // اسم جدول المستخدمين الفعلي
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // أو CASCADE إذا أردتِ حذف المشاريع عند حذف المستخدم
    },
    office_id: { //  مفتاح خارجي لجدول المكاتب
      type: DataTypes.INTEGER,
      allowNull: true, // قد لا يكون مرتبطاً بمكتب في كل الحالات (لكن في حالتنا هذه، نعم)
      references: {
        model: 'offices', // اسم جدول المكاتب الفعلي
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // أو CASCADE
    },
    // يمكنكِ إضافة company_id بنفس الطريقة إذا لزم الأمر
    // company_id: { ... }

  }, {
    timestamps: false, // لأن created_at معرف يدوياً
    underscored: true, // إذا أردتِ user_id و office_id في قاعدة البيانات
  });

  Project.associate = (models) => {
    Project.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
    Project.belongsTo(models.Office, {
      foreignKey: 'office_id',
      as: 'office',
    });
    // Project.belongsTo(models.Company, {
    //   foreignKey: 'company_id',
    //   as: 'company',
    // });
    // Project.hasMany(models.Review, { foreignKey: 'project_id', as: 'reviews' });
  };

  return Project;
};