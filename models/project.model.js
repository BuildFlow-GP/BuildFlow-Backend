// models/project.model.js
module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('projects', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { 
      type: DataTypes.STRING(50), 
      defaultValue: 'Pending Office Approval',
      allowNull: false,
      validate: {
        isIn: [[
          'Pending Office Approval', 
          'Office Approved - Awaiting Details', 
          'Office Rejected',
          'Details Submitted - Pending Office Review',
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
    location: { type: DataTypes.TEXT, allowNull: true }, //  الموقع العام للمشروع
    
    // === حقول معلومات الأرض (موجودة) ===
    land_area: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    plot_number: { type: DataTypes.STRING(50), allowNull: true },
    basin_number: { type: DataTypes.STRING(50), allowNull: true },
    land_location: { type: DataTypes.TEXT, allowNull: true }, //  موقع الأرض التفصيلي (من areaName)

    // === حقول المستندات (موجودة) ===
    license_file: { type: DataTypes.TEXT, allowNull: true }, //  رخصة البناء (قد تكون لاحقاً)
    agreement_file: { type: DataTypes.TEXT, allowNull: true }, //  ملف الاتفاقية (من الخطوة 2)
    document_2d: { type: DataTypes.TEXT, allowNull: true },
    document_3d: { type: DataTypes.TEXT, allowNull: true },

    // === حقول معلومات الاتصال الخاصة بالمشروع (جديدة) ===
    contact_name: { type: DataTypes.STRING(100), allowNull: true },
    contact_id_number: { type: DataTypes.STRING(50), allowNull: true },
    contact_address: { type: DataTypes.TEXT, allowNull: true }, // قد يكون مختلفاً عن location المشروع
    contact_phone: { type: DataTypes.STRING(20), allowNull: true },
    contact_bank_account: { type: DataTypes.STRING(100), allowNull: true },
    
    // === حقل سبب الرفض (من تعديل سابق) ===
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },

    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'userss', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'SET NULL',
    },
    office_id: {
      type: DataTypes.INTEGER,
      allowNull: true, //  مبدئياً true، لكن في طلب الإنشاء المبدئي سيكون مطلوباً
      references: { model: 'offices', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'SET NULL',
    },
  }, {
    timestamps: false,
    underscored: true,
  });

  Project.associate = (models) => {
    Project.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Project.belongsTo(models.Office, { foreignKey: 'office_id', as: 'office' });
    // Project.hasMany(models.Review, { foreignKey: 'project_id', as: 'reviews' });
  };

  return Project;
};