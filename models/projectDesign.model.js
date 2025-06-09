// models/ProjectDesign.model.js
module.exports = (sequelize, DataTypes) => {
  const ProjectDesign = sequelize.define('ProjectDesign', {
    // id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // Sequelize يضيف id تلقائياً إذا لم يكن معرفاً
    floor_count: { type: DataTypes.INTEGER, allowNull: true },
    bedrooms: { type: DataTypes.INTEGER, allowNull: true },
    bathrooms: { type: DataTypes.INTEGER, allowNull: true },
    kitchens: { type: DataTypes.INTEGER, allowNull: true },
    balconies: { type: DataTypes.INTEGER, allowNull: true },
    special_rooms: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true },
    directional_rooms: { type: DataTypes.JSONB, allowNull: true }, //  بيانات توجيه الغرف
    kitchen_type: { type: DataTypes.STRING, allowNull: true },
    master_has_bathroom: { type: DataTypes.BOOLEAN, allowNull: true },
    general_description: { type: DataTypes.TEXT, allowNull: true },
    interior_design: { type: DataTypes.TEXT, allowNull: true }, //  وصف التصميم الداخلي
    room_distribution: { type: DataTypes.TEXT, allowNull: true }, //  وصف توزيع الغرف

    // ✅✅✅ الحقول الجديدة لنطاق الميزانية ✅✅✅
    budget_min: { 
      type: DataTypes.DECIMAL(12, 2), //  نفس نوع budget في ProjectModel
      allowNull: true 
    },
    budget_max: { 
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true 
    },
    //  تأكدي من أن project_id يتم إضافته من خلال العلاقة أو عرفيه هنا إذا لزم الأمر
    //  project_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'projects', key: 'id' } }

  }, {
    tableName: 'project_designs',
    underscored: true,
    timestamps: true, //  من الأفضل إضافة timestamps (createdAt, updatedAt) تلقائياً
                    //  إذا لم تكوني تريدينها، يمكنكِ تركها false أو إزالتها
  });

  ProjectDesign.associate = (models) => {
    ProjectDesign.belongsTo(models.Project, {
      foreignKey: 'project_id', //  تأكدي أن هذا هو اسم المفتاح الخارجي الصحيح
      allowNull: false, //  يجب أن يكون كل تصميم مرتبطاً بمشروع
      onDelete: 'CASCADE',
      as: 'project' //  اسم مستعار للعلاقة (اختياري)
    });
  };

  return ProjectDesign;
};